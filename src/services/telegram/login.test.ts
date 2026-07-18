import {
  saveTelegramPendingLogin,
  saveTelegramSession,
} from 'src/services/hasura/mutations/telegram';
import { getTelegramCredentialsByUserId } from 'src/services/hasura/queries/telegram';
import { Api, TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TelegramInvalidCodeError,
  TelegramLoginNotStartedError,
  TelegramMisconfiguredError,
  TelegramNotProvisionedError,
  TelegramSignUpRequiredError,
  TelegramTwoFactorNotSupportedError,
} from './errors';
import { requestLoginCode, submitLoginCode } from './login';

// vi.fn() + prototype methods: a plain vi.fn is constructable (unlike a
// vi.fn(arrow), which throws "not a constructor" on `new`), and prototype
// methods are shared across instances so the login flow's single client can be
// asserted via TelegramClientMock.prototype.*.
const { TelegramClientMock, StringSessionMock, SignUpRequiredMock } =
  vi.hoisted(() => {
    const clientCtor = vi.fn();
    clientCtor.prototype.connect = vi.fn();
    clientCtor.prototype.sendCode = vi.fn();
    clientCtor.prototype.invoke = vi.fn();
    clientCtor.prototype.disconnect = vi.fn();
    const sessionCtor = vi.fn();
    sessionCtor.prototype.save = vi.fn(() => 'saved-session');
    // A real class so submitLoginCode's `result instanceof
    // Api.auth.AuthorizationSignUpRequired` check is exercisable; referenced
    // directly in tests (not through the typed Api) so its zero-arg constructor
    // doesn't clash with teleproto's real 1-arg signature under tsc.
    class SignUpRequiredMock {}
    return {
      TelegramClientMock: clientCtor,
      StringSessionMock: sessionCtor,
      SignUpRequiredMock,
    };
  });

const mockClient = TelegramClientMock.prototype;

vi.mock('teleproto', () => ({
  TelegramClient: TelegramClientMock,
  Api: {
    auth: {
      SignIn: vi.fn(),
      AuthorizationSignUpRequired: SignUpRequiredMock,
    },
  },
}));

vi.mock('teleproto/sessions', () => ({
  StringSession: StringSessionMock,
}));

vi.mock('src/services/hasura/queries/telegram', () => ({
  getTelegramCredentialsByUserId: vi.fn(),
}));

vi.mock('src/services/hasura/mutations/telegram', () => ({
  saveTelegramPendingLogin: vi.fn(),
  saveTelegramSession: vi.fn(),
}));

const credentials = (overrides = {}) => ({
  phoneNumber: '+15551234567',
  apiId: '111',
  apiHash: 'hash-1',
  sessionString: null,
  pendingSessionString: null,
  pendingPhoneCodeHash: null,
  ...overrides,
});

describe('requestLoginCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.disconnect.mockResolvedValue(undefined);
    mockClient.sendCode.mockResolvedValue({
      phoneCodeHash: 'code-hash',
      isCodeViaApp: true,
    });
  });

  it('sends the code and persists the intermediate session + phone_code_hash', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials(),
    );
    vi.mocked(saveTelegramPendingLogin).mockResolvedValueOnce(1);

    await requestLoginCode('user-1');

    expect(mockClient.connect).toHaveBeenCalledOnce();
    expect(mockClient.sendCode).toHaveBeenCalledWith(
      { apiId: 111, apiHash: 'hash-1' },
      '+15551234567',
    );
    expect(saveTelegramPendingLogin).toHaveBeenCalledWith({
      userId: 'user-1',
      pendingSessionString: 'saved-session',
      phoneCodeHash: 'code-hash',
    });
    expect(mockClient.disconnect).toHaveBeenCalledOnce();
  });

  it('throws (and never builds a client) when the user is not provisioned', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(null);

    await expect(requestLoginCode('nobody')).rejects.toBeInstanceOf(
      TelegramNotProvisionedError,
    );
    expect(TelegramClient).not.toHaveBeenCalled();
  });

  it('throws (still disconnecting) when the row vanished before the write', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials(),
    );
    vi.mocked(saveTelegramPendingLogin).mockResolvedValueOnce(0);

    await expect(requestLoginCode('user-1')).rejects.toBeInstanceOf(
      TelegramNotProvisionedError,
    );
    expect(mockClient.disconnect).toHaveBeenCalledOnce();
  });

  // sendCode is the first Telegram contact with the provisioned phone, so
  // phone-level RPC errors surface here and must be mapped to the typed taxonomy.
  it.each([
    ['PHONE_NUMBER_INVALID', TelegramMisconfiguredError],
    ['PHONE_NUMBER_BANNED', TelegramMisconfiguredError],
    ['PHONE_NUMBER_UNOCCUPIED', TelegramSignUpRequiredError],
  ])(
    'maps sendCode %s to a typed error (never persists)',
    async (errorMessage, ErrorType) => {
      vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
        credentials(),
      );
      mockClient.sendCode.mockRejectedValueOnce({ errorMessage });

      await expect(requestLoginCode('user-1')).rejects.toBeInstanceOf(
        ErrorType,
      );
      expect(saveTelegramPendingLogin).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalledOnce();
    },
  );
});

describe('submitLoginCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.disconnect.mockResolvedValue(undefined);
    mockClient.invoke.mockResolvedValue(undefined);
  });

  it('signs in with the code and persists the authorized session', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials({
        pendingSessionString: 'intermediate-session',
        pendingPhoneCodeHash: 'code-hash',
      }),
    );
    vi.mocked(saveTelegramSession).mockResolvedValueOnce(1);

    await submitLoginCode('user-1', '12345');

    expect(StringSession).toHaveBeenCalledWith('intermediate-session');
    expect(Api.auth.SignIn).toHaveBeenCalledWith({
      phoneNumber: '+15551234567',
      phoneCodeHash: 'code-hash',
      phoneCode: '12345',
    });
    expect(mockClient.invoke).toHaveBeenCalledOnce();
    expect(saveTelegramSession).toHaveBeenCalledWith({
      userId: 'user-1',
      sessionString: 'saved-session',
    });
    expect(mockClient.disconnect).toHaveBeenCalledOnce();
  });

  it('throws TelegramSignUpRequiredError (and never persists) when the phone has no account', async () => {
    // auth.SignIn RESOLVES with AuthorizationSignUpRequired for an unregistered
    // phone — the session is not authorized and must not reach session_string.
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials({
        pendingSessionString: 'intermediate-session',
        pendingPhoneCodeHash: 'code-hash',
      }),
    );
    mockClient.invoke.mockResolvedValueOnce(new SignUpRequiredMock());

    await expect(submitLoginCode('user-1', '12345')).rejects.toBeInstanceOf(
      TelegramSignUpRequiredError,
    );
    expect(saveTelegramSession).not.toHaveBeenCalled();
    expect(mockClient.disconnect).toHaveBeenCalledOnce();
  });

  it.each(['PHONE_CODE_INVALID', 'PHONE_CODE_EMPTY', 'PHONE_CODE_EXPIRED'])(
    'maps %s to TelegramInvalidCodeError (recoverable, never persisted)',
    async (errorMessage) => {
      vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
        credentials({
          pendingSessionString: 'intermediate-session',
          pendingPhoneCodeHash: 'code-hash',
        }),
      );
      mockClient.invoke.mockRejectedValueOnce({ errorMessage });

      await expect(submitLoginCode('user-1', '99999')).rejects.toBeInstanceOf(
        TelegramInvalidCodeError,
      );
      expect(saveTelegramSession).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalledOnce();
    },
  );

  it('maps SESSION_PASSWORD_NEEDED to TelegramTwoFactorNotSupportedError', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials({
        pendingSessionString: 'intermediate-session',
        pendingPhoneCodeHash: 'code-hash',
      }),
    );
    mockClient.invoke.mockRejectedValueOnce({
      errorMessage: 'SESSION_PASSWORD_NEEDED',
    });

    await expect(submitLoginCode('user-1', '12345')).rejects.toBeInstanceOf(
      TelegramTwoFactorNotSupportedError,
    );
    expect(saveTelegramSession).not.toHaveBeenCalled();
    expect(mockClient.disconnect).toHaveBeenCalledOnce();
  });

  it('throws TelegramLoginNotStartedError when there is no pending login', async () => {
    // Authorized session but no requestLoginCode in flight (pending fields null).
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      credentials({ sessionString: 'authorized-session' }),
    );

    await expect(submitLoginCode('user-1', '12345')).rejects.toBeInstanceOf(
      TelegramLoginNotStartedError,
    );
    expect(mockClient.invoke).not.toHaveBeenCalled();
  });

  it('throws TelegramNotProvisionedError when the user has no row', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(null);

    await expect(submitLoginCode('nobody', '12345')).rejects.toBeInstanceOf(
      TelegramNotProvisionedError,
    );
  });
});
