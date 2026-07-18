import { getTelegramCredentialsByUserId } from 'src/services/hasura/queries/telegram';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTelegramClient,
  getTelegramClient,
  parseApiId,
  withTelegramClient,
} from './client';
import {
  TelegramMisconfiguredError,
  TelegramNotAuthenticatedError,
  TelegramNotProvisionedError,
} from './errors';

// vi.fn() + prototype methods: a plain vi.fn is constructable (unlike a
// vi.fn(arrow), which throws "not a constructor" on `new`), and prototype
// methods are shared across instances so they stay assertable.
const { TelegramClientMock, StringSessionMock } = vi.hoisted(() => {
  const clientCtor = vi.fn();
  clientCtor.prototype.connect = vi.fn().mockResolvedValue(undefined);
  clientCtor.prototype.disconnect = vi.fn().mockResolvedValue(undefined);
  const sessionCtor = vi.fn();
  sessionCtor.prototype.save = vi.fn(() => 'saved-session');
  return { TelegramClientMock: clientCtor, StringSessionMock: sessionCtor };
});

vi.mock('teleproto', () => ({
  TelegramClient: TelegramClientMock,
}));

vi.mock('teleproto/sessions', () => ({
  StringSession: StringSessionMock,
}));

vi.mock('src/services/hasura/queries/telegram', () => ({
  getTelegramCredentialsByUserId: vi.fn(),
}));

const readyRow = (overrides = {}) => ({
  phoneNumber: '+15551234567',
  apiId: '111',
  apiHash: 'hash-1',
  sessionString: 'session-1',
  pendingSessionString: null,
  pendingPhoneCodeHash: null,
  ...overrides,
});

describe('parseApiId', () => {
  it('parses a valid integer string', () => {
    expect(parseApiId('123')).toBe(123);
  });

  it('throws on a blank/whitespace value (which Number coerces to 0)', () => {
    expect(() => parseApiId('   ')).toThrow(
      'Telegram API ID must be a valid integer.',
    );
  });

  it('throws on a non-integer value', () => {
    expect(() => parseApiId('12.5')).toThrow(
      'Telegram API ID must be a valid integer.',
    );
  });

  it('rejects hex and exponent forms that Number() would silently accept', () => {
    // Number('0x10') === 16 and Number('1e3') === 1000 — both are wrong-but-valid
    // apiIds, so the decimal-only guard must reject them.
    expect(() => parseApiId('0x10')).toThrow(
      'Telegram API ID must be a valid integer.',
    );
    expect(() => parseApiId('1e3')).toThrow(
      'Telegram API ID must be a valid integer.',
    );
  });
});

describe('createTelegramClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a TelegramClient from the given session/apiId/apiHash', () => {
    const session = new StringSession('s');

    createTelegramClient({ session, apiId: 123, apiHash: 'hash' });

    expect(TelegramClient).toHaveBeenCalledWith(session, 123, 'hash', {
      connectionRetries: 5,
    });
  });
});

describe('withTelegramClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TelegramClientMock.prototype.connect.mockResolvedValue(undefined);
    TelegramClientMock.prototype.disconnect.mockResolvedValue(undefined);
  });

  it('connects, runs the callback, and always disconnects', async () => {
    const session = new StringSession('s');
    const run = vi.fn().mockResolvedValue('result');

    const result = await withTelegramClient(
      { session, apiId: 123, apiHash: 'hash' },
      run,
    );

    expect(result).toBe('result');
    expect(TelegramClientMock.prototype.connect).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
    expect(TelegramClientMock.prototype.disconnect).toHaveBeenCalledOnce();
  });

  it('disconnects even when the callback throws, surfacing the callback error', async () => {
    const session = new StringSession('s');
    const boom = new Error('callback failed');

    await expect(
      withTelegramClient({ session, apiId: 123, apiHash: 'hash' }, async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(TelegramClientMock.prototype.disconnect).toHaveBeenCalledOnce();
  });

  it('swallows a disconnect failure so it cannot mask the callback error', async () => {
    const session = new StringSession('s');
    const boom = new Error('callback failed');
    TelegramClientMock.prototype.disconnect.mockRejectedValueOnce(
      new Error('disconnect failed'),
    );

    // The callback error, not the disconnect error, must surface.
    await expect(
      withTelegramClient({ session, apiId: 123, apiHash: 'hash' }, async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
  });
});

describe('getTelegramClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a connected client from the calling user’s own stored credentials', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(readyRow());

    const client = await getTelegramClient('user-1');

    expect(StringSession).toHaveBeenCalledWith('session-1');
    expect(TelegramClient).toHaveBeenCalledWith(
      expect.anything(),
      111,
      'hash-1',
      { connectionRetries: 5 },
    );
    expect(client.connect).toHaveBeenCalledOnce();
  });

  it('uses a different user’s own credentials — never crosses users', async () => {
    // userId is the function argument, never read from the row — the query is
    // filtered by it upstream. Varying the returned creds shows the client is
    // built from whatever that user's own row holds.
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      readyRow({
        apiId: '222',
        apiHash: 'hash-2',
        sessionString: 'session-2',
      }),
    );

    await getTelegramClient('user-2');

    expect(StringSession).toHaveBeenCalledWith('session-2');
    expect(TelegramClient).toHaveBeenCalledWith(
      expect.anything(),
      222,
      'hash-2',
      { connectionRetries: 5 },
    );
  });

  it('trims a whitespace-padded api_hash before building the client', async () => {
    // The load choke point normalizes the static fields, so a copy-paste
    // provisioning slip with surrounding whitespace never reaches TelegramClient
    // as an opaque auth failure.
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      readyRow({ apiHash: '  hash-1  ' }),
    );

    await getTelegramClient('user-1');

    expect(TelegramClient).toHaveBeenCalledWith(
      expect.anything(),
      111,
      'hash-1',
      { connectionRetries: 5 },
    );
  });

  it('throws TelegramNotProvisionedError when the user has no credentials row', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(null);

    await expect(getTelegramClient('nobody')).rejects.toBeInstanceOf(
      TelegramNotProvisionedError,
    );
    expect(TelegramClient).not.toHaveBeenCalled();
  });

  it('throws TelegramNotAuthenticatedError when there is no session yet', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      readyRow({ sessionString: null }),
    );

    await expect(getTelegramClient('user-1')).rejects.toBeInstanceOf(
      TelegramNotAuthenticatedError,
    );
  });

  it('stays ready (uses session_string) while a re-login is still pending', async () => {
    // Finding-[0] guard: an authorized user starting a fresh login writes the
    // intermediate into pending_session_string, leaving session_string intact.
    // getTelegramClient must keep working off session_string and never touch the
    // pending fields — so list/import survive an abandoned re-login.
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      readyRow({
        pendingSessionString: 'intermediate-relogin',
        pendingPhoneCodeHash: 'still-pending',
      }),
    );

    const client = await getTelegramClient('user-1');

    expect(StringSession).toHaveBeenCalledWith('session-1');
    expect(client.connect).toHaveBeenCalledOnce();
  });

  // Every hand-provisioned static field is validated at the load choke point,
  // trimmed so a whitespace-only value can't slip past a plain falsiness check.
  it.each([
    ['non-decimal api_id', { apiId: '12x3' }],
    ['hex api_id', { apiId: '0x10' }],
    ['blank api_hash', { apiHash: '' }],
    ['whitespace-only api_hash', { apiHash: '   ' }],
    ['blank phone_number', { phoneNumber: '' }],
    ['whitespace-only phone_number', { phoneNumber: '  ' }],
  ])('throws TelegramMisconfiguredError on %s', async (_label, overrides) => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(
      readyRow(overrides),
    );

    await expect(getTelegramClient('user-1')).rejects.toBeInstanceOf(
      TelegramMisconfiguredError,
    );
    expect(TelegramClient).not.toHaveBeenCalled();
  });

  it('disconnects (and rethrows) if connect() rejects, so it cannot leak the client', async () => {
    vi.mocked(getTelegramCredentialsByUserId).mockResolvedValueOnce(readyRow());
    const boom = new Error('connect failed');
    TelegramClientMock.prototype.connect.mockRejectedValueOnce(boom);

    await expect(getTelegramClient('user-1')).rejects.toBe(boom);
    expect(TelegramClientMock.prototype.disconnect).toHaveBeenCalledOnce();
  });
});
