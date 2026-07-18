// Distinguishable error types for the per-user Telegram flow, so the gateway
// routes (SWO-494) can map them to specific action responses — most importantly
// the "needs login" signal the extension popup watches for to show its
// login-code prompt instead of the video picker.

interface TelegramErrorOptions {
  /**
   * The raw error we mapped from (a teleproto RPCError), preserved as the
   * standard Error `cause` so a mapped failure can still be traced back to the
   * original errorMessage/stack in logs — e.g. to catch a Telegram error-string
   * change — instead of the synthetic message being all that survives.
   */
  cause?: unknown;
}

/**
 * Base for the per-user Telegram error taxonomy. Every telegram service-layer
 * failure is one of these, so the gateway (SWO-494) can `instanceof
 * TelegramError` once and then discriminate on the concrete subclass (`name`)
 * to choose an action response. Deliberately NOT a `CustomError`: CustomError's
 * userMessage/shouldRetry/shouldNotify are keyed off ERROR_CONFIG codes in the
 * shared `@shinabr2/core` package, which has no telegram codes — adding them is
 * a cross-repo change out of this PR's scope. The gateway remains the right
 * boundary to wrap these into a CustomError (it needs a type→popup-state map
 * either way). Carries `userId` for logs (never a secret) and threads `cause`.
 */
class TelegramError extends Error {
  readonly userId: string;

  constructor(message: string, userId: string, options?: TelegramErrorOptions) {
    super(message, { cause: options?.cause });
    this.userId = userId;
    this.name = 'TelegramError';
  }
}

/**
 * The user has no telegram_credentials row at all. phone/api_id/api_hash are
 * provisioned out-of-band (the owner inserts the row by hand), so this means
 * "Telegram isn't set up for this user yet".
 */
class TelegramNotProvisionedError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `No Telegram credentials provisioned for user ${userId}`,
      userId,
      options,
    );
    this.name = 'TelegramNotProvisionedError';
  }
}

/**
 * The user has a credentials row but has never completed login, so session_string
 * is empty. (An in-progress re-login lives in pending_session_string and does NOT
 * trigger this — an already-authorized session stays usable.) This is the signal
 * the popup uses to prompt for a login code.
 */
class TelegramNotAuthenticatedError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(`Telegram login required for user ${userId}`, userId, options);
    this.name = 'TelegramNotAuthenticatedError';
  }
}

/**
 * submitLoginCode was called with no preceding requestLoginCode (no pending
 * phone_code_hash on the row), so there is no login to complete.
 */
class TelegramLoginNotStartedError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `No pending Telegram login for user ${userId}; request a code first`,
      userId,
      options,
    );
    this.name = 'TelegramLoginNotStartedError';
  }
}

/**
 * The credentials row exists but a hand-provisioned static field is malformed —
 * a non-decimal api_id, a blank/whitespace api_hash, or a phone_number Telegram
 * rejects as invalid/banned. Distinct from NotProvisioned (no row at all): here
 * the row is present but unusable, so the gateway can tell the operator to fix
 * provisioning rather than report a 500. The message names all three provisioned
 * fields (not just api_id/api_hash) because a bad phone_number routes here too —
 * the remediation is the same category ("fix the provisioned row") regardless of
 * which field is wrong.
 */
class TelegramMisconfiguredError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `Telegram credentials for user ${userId} are malformed (check the provisioned api_id, api_hash and phone_number)`,
      userId,
      options,
    );
    this.name = 'TelegramMisconfiguredError';
  }
}

/**
 * auth.SignIn rejected because the submitted code was wrong, empty, or expired
 * (PHONE_CODE_INVALID / PHONE_CODE_EMPTY / PHONE_CODE_EXPIRED). This is the
 * common recoverable login failure — the popup should re-prompt for the code
 * (requesting a fresh one if it had expired) rather than surface a raw error.
 */
class TelegramInvalidCodeError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `Telegram login code was invalid or expired for user ${userId}`,
      userId,
      options,
    );
    this.name = 'TelegramInvalidCodeError';
  }
}

/**
 * auth.SignIn succeeded at the protocol level but returned
 * AuthorizationSignUpRequired — Telegram has no account for the provisioned phone
 * (it would need to be registered first). The session is NOT authorized, so we
 * must refuse to persist it as one. Signals a bad/unregistered phone_number, not
 * a wrong code.
 */
class TelegramSignUpRequiredError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `Telegram has no account for the provisioned phone (sign-up required) for user ${userId}`,
      userId,
      options,
    );
    this.name = 'TelegramSignUpRequiredError';
  }
}

/**
 * The provisioned account has a 2FA password enabled, so auth.SignIn rejected
 * with SESSION_PASSWORD_NEEDED. The SRP password step is intentionally out of
 * scope for this pass — this typed error surfaces that clearly instead of leaking
 * a raw MTProto error.
 */
class TelegramTwoFactorNotSupportedError extends TelegramError {
  constructor(userId: string, options?: TelegramErrorOptions) {
    super(
      `Telegram account requires a 2FA password, which is not supported, for user ${userId}`,
      userId,
      options,
    );
    this.name = 'TelegramTwoFactorNotSupportedError';
  }
}

export {
  TelegramError,
  TelegramInvalidCodeError,
  TelegramLoginNotStartedError,
  TelegramMisconfiguredError,
  TelegramNotAuthenticatedError,
  TelegramNotProvisionedError,
  TelegramSignUpRequiredError,
  TelegramTwoFactorNotSupportedError,
};
