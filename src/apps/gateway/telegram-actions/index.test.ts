import type { Context } from 'hono';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { telegramActionsRouter } from './index';

vi.mock('./routes/list', () => ({
  listTelegramChannelVideos: vi.fn(),
}));

vi.mock('./routes/import', () => ({
  importTelegramArchive: vi.fn(),
}));

vi.mock('src/utils/requestHandler', () => ({
  honoRequestHandler: vi.fn(
    (handler: (c: Context) => Promise<Response> | Response) => handler,
  ),
}));

vi.mock('src/utils/validators/request', () => ({
  honoValidateRequest: vi.fn(
    () => (_c: Context, next: () => Promise<void>) => next(),
  ),
}));

describe('telegramActionsRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/telegram-actions', telegramActionsRouter);
  });

  it('registers /list with listTelegramChannelVideosSchema and listTelegramChannelVideos', async () => {
    const { honoValidateRequest } = await import(
      'src/utils/validators/request'
    );
    const { honoRequestHandler } = await import('src/utils/requestHandler');
    const { listTelegramChannelVideosSchema } = await import(
      'src/schema/telegram/list'
    );
    const { listTelegramChannelVideos } = await import('./routes/list');

    await app.fetch(
      new Request('http://localhost/telegram-actions/list', {
        method: 'POST',
      }),
    );

    expect(honoValidateRequest).toHaveBeenCalledWith(
      listTelegramChannelVideosSchema,
    );
    expect(vi.mocked(honoRequestHandler).mock.calls[0][0]).toBe(
      listTelegramChannelVideos,
    );
  });

  it('registers /import with importTelegramArchiveSchema and importTelegramArchive', async () => {
    const { honoValidateRequest } = await import(
      'src/utils/validators/request'
    );
    const { honoRequestHandler } = await import('src/utils/requestHandler');
    const { importTelegramArchiveSchema } = await import(
      'src/schema/telegram/import'
    );
    const { importTelegramArchive } = await import('./routes/import');

    await app.fetch(
      new Request('http://localhost/telegram-actions/import', {
        method: 'POST',
      }),
    );

    expect(honoValidateRequest).toHaveBeenCalledWith(
      importTelegramArchiveSchema,
    );
    expect(vi.mocked(honoRequestHandler).mock.calls[1][0]).toBe(
      importTelegramArchive,
    );
  });
});
