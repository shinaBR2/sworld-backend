import {
  getTelegramCredentialsByUserId,
  type TelegramCredentials,
} from 'src/services/hasura/queries/telegram';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import {
  TelegramMisconfiguredError,
  TelegramNotAuthenticatedError,
  TelegramNotProvisionedError,
} from './errors';

/** MTProto client tuning: same retry budget shown in teleproto's own quick start. */
const CONNECTION_RETRIES = 5;

/** Telegram api_ids are plain positive decimal integers. */
const API_ID_PATTERN = /^\d+$/;

/**
 * api_id is stored as text (alongside api_hash, which is also text), so coerce
 * it here. A plain `Number()` is too lenient — it accepts hex ('0x10'),
 * exponents ('1e3'), and whitespace-padded values, any of which would silently
 * become a wrong-but-valid apiId. Require exactly a run of digits. Callers on the
 * credential path validate via loadTelegramCredentials first (typed error); this
 * guard is the pure-parser's own defensive contract.
 */
const parseApiId = (apiId: string): number => {
  const trimmed = apiId.trim();
  if (!API_ID_PATTERN.test(trimmed)) {
    throw new Error('Telegram API ID must be a valid integer.');
  }
  return Number(trimmed);
};

interface LoadedTelegramCredentials {
  credentials: TelegramCredentials;
  /** api_id already parsed to a number (createTelegramClient needs the number). */
  apiId: number;
}

/**
 * Load the caller's OWN credentials row, or throw a typed error the gateway can
 * route on: `TelegramNotProvisionedError` when there is no row, or
 * `TelegramMisconfiguredError` when the row exists but its hand-provisioned
 * static fields are malformed. This is THE validation choke point — every one of
 * phone_number, api_id, api_hash is hand-entered and used raw downstream
 * (sendCode / TelegramClient), so all three are validated here (api_hash /
 * phone_number trimmed, so a whitespace-only value doesn't slip past a plain
 * falsiness check; api_id via `parseApiId`, whose decimal-only result is returned
 * so callers don't re-parse it) rather than letting an opaque MTProto error
 * surface mid-connect. The single load+validate point shared by the client
 * factory and both login steps. The caller must already have scoped `userId` to
 * the verified identity (x-hasura-user-id) — this query trusts whatever userId it
 * is given.
 */
const loadTelegramCredentials = async (
  userId: string,
): Promise<LoadedTelegramCredentials> => {
  const credentials = await getTelegramCredentialsByUserId(userId);
  if (!credentials) {
    throw new TelegramNotProvisionedError(userId);
  }
  if (!credentials.apiHash.trim() || !credentials.phoneNumber.trim()) {
    throw new TelegramMisconfiguredError(userId);
  }
  try {
    // parseApiId owns the decimal-only api_id rule; reuse it (not a second inline
    // regex) and keep its number result so no caller re-parses.
    return { credentials, apiId: parseApiId(credentials.apiId) };
  } catch {
    throw new TelegramMisconfiguredError(userId);
  }
};

interface CreateTelegramClientParams {
  session: StringSession;
  apiId: number;
  apiHash: string;
}

/**
 * Low-level builder. Takes a `StringSession` instance (not a raw string) so the
 * login flow can hold onto it and call `.save()` after sending the code. Does
 * NOT connect — callers invoke `.connect()` themselves. Used by the login flow
 * (a blank/intermediate session) and by `getTelegramClient` (a user's stored
 * authorized session). Never log the session: it is a credential equivalent to
 * a password.
 *
 * Assumes apiId/apiHash are already validated — every caller loads them through
 * `loadTelegramCredentials`, which is the single typed-error validation point.
 */
const createTelegramClient = ({
  session,
  apiId,
  apiHash,
}: CreateTelegramClientParams): TelegramClient =>
  new TelegramClient(session, apiId, apiHash, {
    connectionRetries: CONNECTION_RETRIES,
  });

/**
 * Build a client, connect it, run `run`, and ALWAYS disconnect afterwards —
 * swallowing disconnect failures so they can't mask an error thrown by `run`.
 * For the login steps, which own the whole connection lifecycle (unlike
 * `getTelegramClient`, which hands its connected client to the caller).
 */
const withTelegramClient = async <T>(
  params: CreateTelegramClientParams,
  run: (client: TelegramClient) => Promise<T>,
): Promise<T> => {
  const client = createTelegramClient(params);
  try {
    await client.connect();
    return await run(client);
  } finally {
    await client.disconnect().catch(() => {});
  }
};

/**
 * Build a connected MTProto client for a specific user from their own stored,
 * authorized session — the per-user replacement for the old process-wide
 * singleton. Each request builds its own client (Cloud Run is stateless and
 * horizontally scaled, so a per-process cache would not help). Callers that do
 * several operations in one logical unit (e.g. the SWO-495 import: list then
 * fetch N videos) should build ONE client and reuse it, not call this per item —
 * repeated connect/auth from the same account can trip Telegram's FLOOD_WAIT.
 *
 * Throws `TelegramNotProvisionedError` if the user has no credentials row, or
 * `TelegramNotAuthenticatedError` if they have not completed login (no
 * session_string yet). session_string only ever holds an AUTHORIZED session — an
 * in-progress login lives in the separate pending_session_string column — so the
 * ready invariant is simply: session_string set. A pending re-login does not make
 * an already-authorized user un-ready, so pending fields are not consulted here.
 *
 * Readiness is presence-only by design: this does NOT probe validity (e.g. a
 * getMe round-trip) — that cost is paid on every build, and a session revoked
 * elsewhere is better detected where the real API call fails. The gateway
 * (SWO-494) maps that runtime AUTH_KEY_UNREGISTERED to the popup's re-login
 * signal; connect() here only establishes transport, not user authorization.
 *
 * The returned client is connected; the caller is responsible for `disconnect()`.
 */
const getTelegramClient = async (userId: string): Promise<TelegramClient> => {
  const { credentials, apiId } = await loadTelegramCredentials(userId);
  if (!credentials.sessionString) {
    throw new TelegramNotAuthenticatedError(userId);
  }

  const client = createTelegramClient({
    session: new StringSession(credentials.sessionString),
    apiId,
    apiHash: credentials.apiHash,
  });
  try {
    await client.connect();
  } catch (error) {
    // connect() opened transport before failing — disconnect so a rejected
    // connect on this per-request hot path can't leak sockets on the long-lived
    // instance. The caller only owns disconnect() once it HAS the client.
    await client.disconnect().catch(() => {});
    throw error;
  }
  return client;
};

export {
  createTelegramClient,
  getTelegramClient,
  loadTelegramCredentials,
  parseApiId,
  withTelegramClient,
};
