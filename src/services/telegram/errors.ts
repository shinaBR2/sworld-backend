// Distinguishable error types for the per-user Telegram flow, so the gateway
// routes (SWO-494) can map them to specific action responses — most importantly
// the "needs login" signal the extension popup watches for to show its
// login-code prompt instead of the video picker.

/**
 * The user has no telegram_credentials row at all. phone/api_id/api_hash are
 * provisioned out-of-band (the owner inserts the row by hand), so this means
 * "Telegram isn't set up for this user yet".
 */
class TelegramNotProvisionedError extends Error {
  constructor(userId: string) {
    super(`No Telegram credentials provisioned for user ${userId}`);
    this.name = 'TelegramNotProvisionedError';
  }
}

/**
 * The user has a credentials row but has never completed login, so session_string
 * is empty. (An in-progress re-login lives in pending_session_string and does NOT
 * trigger this — an already-authorized session stays usable.) This is the signal
 * the popup uses to prompt for a login code.
 */
class TelegramNotAuthenticatedError extends Error {
  constructor(userId: string) {
    super(`Telegram login required for user ${userId}`);
    this.name = 'TelegramNotAuthenticatedError';
  }
}

/**
 * submitLoginCode was called with no preceding requestLoginCode (no pending
 * phone_code_hash on the row), so there is no login to complete.
 */
class TelegramLoginNotStartedError extends Error {
  constructor(userId: string) {
    super(`No pending Telegram login for user ${userId}; request a code first`);
    this.name = 'TelegramLoginNotStartedError';
  }
}

/**
 * The credentials row exists but its hand-provisioned static fields are
 * malformed — a non-decimal api_id or a blank api_hash. Distinct from
 * NotProvisioned (no row at all): here the row is present but unusable, so the
 * gateway can tell the operator to fix provisioning rather than report a 500.
 */
class TelegramMisconfiguredError extends Error {
  constructor(userId: string) {
    super(
      `Telegram credentials for user ${userId} are malformed (check api_id / api_hash)`,
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
class TelegramInvalidCodeError extends Error {
  constructor(userId: string) {
    super(`Telegram login code was invalid or expired for user ${userId}`);
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
class TelegramSignUpRequiredError extends Error {
  constructor(userId: string) {
    super(
      `Telegram has no account for the provisioned phone (sign-up required) for user ${userId}`,
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
class TelegramTwoFactorNotSupportedError extends Error {
  constructor(userId: string) {
    super(
      `Telegram account requires a 2FA password, which is not supported, for user ${userId}`,
    );
    this.name = 'TelegramTwoFactorNotSupportedError';
  }
}

export {
  TelegramInvalidCodeError,
  TelegramLoginNotStartedError,
  TelegramMisconfiguredError,
  TelegramNotAuthenticatedError,
  TelegramNotProvisionedError,
  TelegramSignUpRequiredError,
  TelegramTwoFactorNotSupportedError,
};
