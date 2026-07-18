import {
  saveTelegramPendingLogin,
  saveTelegramSession,
} from 'src/services/hasura/mutations/telegram';
import { Api } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { loadTelegramCredentials, withTelegramClient } from './client';
import {
  TelegramInvalidCodeError,
  TelegramLoginNotStartedError,
  TelegramMisconfiguredError,
  TelegramNotProvisionedError,
  TelegramSignUpRequiredError,
  TelegramTwoFactorNotSupportedError,
} from './errors';

/** teleproto rejects RPC calls with an RPCError carrying an `errorMessage`. */
const rpcErrorMessage = (error: unknown): string | undefined =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as { errorMessage?: unknown }).errorMessage === 'string'
    ? (error as { errorMessage: string }).errorMessage
    : undefined;

/** A wrong/empty/expired login code — recoverable; the popup re-prompts. */
const INVALID_CODE_MESSAGES = new Set([
  'PHONE_CODE_INVALID',
  'PHONE_CODE_EMPTY',
  'PHONE_CODE_EXPIRED',
]);
/** A bad provisioned phone number — the operator must fix the credentials row. */
const MISCONFIGURED_PHONE_MESSAGES = new Set([
  'PHONE_NUMBER_INVALID',
  'PHONE_NUMBER_BANNED',
]);

/**
 * Translate a raw teleproto RPCError (from sendCode or auth.SignIn) into the
 * typed telegram-error taxonomy the gateway (SWO-494) routes on, or `undefined`
 * when it isn't one we classify (the caller rethrows it raw). Shared by both
 * login steps so the mapping lives in one place.
 *
 * Out of scope, by design: exotic alternate-auth account states. A 2FA password
 * (SESSION_PASSWORD_NEEDED) maps to a typed "not supported" error; a Telegram
 * login-email account can't complete phone-code sign-in and surfaces raw (a known
 * limitation, tracked alongside 2FA) rather than growing the map to chase the
 * full MTProto RPC-error space.
 */
const toTypedTelegramError = (
  error: unknown,
  userId: string,
): Error | undefined => {
  const message = rpcErrorMessage(error);
  if (message === undefined) {
    return undefined;
  }
  if (message === 'SESSION_PASSWORD_NEEDED') {
    return new TelegramTwoFactorNotSupportedError(userId);
  }
  if (INVALID_CODE_MESSAGES.has(message)) {
    return new TelegramInvalidCodeError(userId);
  }
  // No Telegram account for the provisioned phone — same product state as
  // auth.SignIn's AuthorizationSignUpRequired result.
  if (message === 'PHONE_NUMBER_UNOCCUPIED') {
    return new TelegramSignUpRequiredError(userId);
  }
  if (MISCONFIGURED_PHONE_MESSAGES.has(message)) {
    return new TelegramMisconfiguredError(userId);
  }
  return undefined;
};

/** Rethrow a raw MTProto error as its typed equivalent when recognised. */
const rethrowTyped = (error: unknown, userId: string): never => {
  throw toTypedTelegramError(error, userId) ?? error;
};

/**
 * Step 1 of the in-product MTProto login: ask Telegram to send a login code to
 * the user's own device.
 *
 * Loads the user's provisioned phone/api credentials, calls `sendCode` on a
 * fresh connection, and persists BOTH the returned phone_code_hash AND the
 * intermediate (still-unauthorized) session string. The intermediate session
 * matters: the code Telegram just sent is only valid against the auth key
 * established on this connection, so `submitLoginCode` must resume that exact
 * session rather than start a new one.
 *
 * The intermediate session is written to pending_session_string, NOT
 * session_string — so if this user already has an authorized session, starting a
 * new login (and abandoning it) never destroys the working one. The pair
 * (pending_session_string, pending_phone_code_hash) is the login-in-progress
 * state that `submitLoginCode` consumes.
 */
const requestLoginCode = async (userId: string): Promise<void> => {
  const { credentials, apiId } = await loadTelegramCredentials(userId);
  const session = new StringSession('');

  const affectedRows = await withTelegramClient(
    { session, apiId, apiHash: credentials.apiHash },
    async (client) => {
      const { phoneCodeHash } = await client
        .sendCode(
          { apiId, apiHash: credentials.apiHash },
          credentials.phoneNumber,
        )
        .catch((error) => rethrowTyped(error, userId));
      return saveTelegramPendingLogin({
        userId,
        pendingSessionString: session.save(),
        phoneCodeHash,
      });
    },
  );

  if (affectedRows === 0) {
    // The row was deleted between the read above and this write. Telegram has
    // already texted a code, but there's nothing to consume it against — the row
    // is genuinely gone, so NotProvisioned is the correct signal (re-provision,
    // then request a fresh code). The narrow window is only reachable by the same
    // single user deleting their own row mid-login, and sendCode's side effect
    // can't be rolled back, so the stale code is an accepted, benign outcome.
    throw new TelegramNotProvisionedError(userId);
  }
};

/**
 * Step 2 of the login: complete sign-in with the code the user received.
 *
 * Rebuilds the client from the intermediate session saved by `requestLoginCode`
 * (pending_session_string, so the phone_code_hash is valid), calls `auth.signIn`,
 * and on success promotes the now-authorized session into session_string and
 * clears both pending fields — moving the row into the ready state.
 *
 * Non-success outcomes are handled so session_string is never populated with a
 * non-authorized session: auth.SignIn RESOLVES (not throws) with
 * `AuthorizationSignUpRequired` when the phone has no Telegram account, and it
 * REJECTS with codes (wrong/expired code, 2FA password, bad phone) that
 * `toTypedTelegramError` maps to the typed taxonomy. All surface as typed errors.
 */
const submitLoginCode = async (userId: string, code: string): Promise<void> => {
  const { credentials, apiId } = await loadTelegramCredentials(userId);
  if (!credentials.pendingSessionString || !credentials.pendingPhoneCodeHash) {
    throw new TelegramLoginNotStartedError(userId);
  }

  // Capture into locals: the guard above narrows these to string, but that
  // narrowing would be lost inside the async callback closure below.
  const { phoneNumber, pendingPhoneCodeHash } = credentials;
  // Hold the StringSession instance (rather than reading back client.session,
  // typed as the abstract Session base) so .save() is typed to return string.
  const session = new StringSession(credentials.pendingSessionString);

  const affectedRows = await withTelegramClient(
    { session, apiId, apiHash: credentials.apiHash },
    async (client) => {
      const result = await client
        .invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash: pendingPhoneCodeHash,
            phoneCode: code,
          }),
        )
        .catch((error) => rethrowTyped(error, userId));

      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        // Session is NOT authorized — refuse to persist it as one.
        throw new TelegramSignUpRequiredError(userId);
      }

      return saveTelegramSession({ userId, sessionString: session.save() });
    },
  );

  if (affectedRows === 0) {
    // Row deleted between the load above and this write, AFTER a successful
    // (irreversible) sign-in — the authorized session is orphaned. Same accepted
    // race as requestLoginCode: only the user's own concurrent row deletion can
    // reach it, and there's no row left to persist into, so NotProvisioned is the
    // honest signal (re-provision, then log in again).
    throw new TelegramNotProvisionedError(userId);
  }
};

export { requestLoginCode, submitLoginCode };
