import type { ListTelegramChannelVideosOutput } from 'src/schema/telegram/list';
import { getTelegramClient } from 'src/services/telegram/client';
import { Api } from 'teleproto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listTelegramChannelVideos } from './index';

// The handler's real return type is a union across its success/error branches;
// narrowing it here keeps every `result.dataObject` access below type-safe.
const callList = (context: unknown) =>
  listTelegramChannelVideos(context as any) as Promise<{
    success: boolean;
    message: string;
    dataObject: ListTelegramChannelVideosOutput;
  }>;

const mockClient = {
  connect: vi.fn(),
  getInputEntity: vi.fn(),
  getMessages: vi.fn(),
  downloadMedia: vi.fn(),
};

vi.mock('src/services/telegram/client', () => ({
  getTelegramClient: vi.fn(() => mockClient),
}));

vi.mock('src/utils/logger', () => {
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { getCurrentLogger: vi.fn(() => mockLogger) };
});

const buildVideoMessage = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  date: 1_700_000_000,
  message: 'a caption',
  video: {
    size: 123_456n,
    thumbs: [{}],
    attributes: [
      new Api.DocumentAttributeFilename({ fileName: 'clip.mp4' }),
      new Api.DocumentAttributeVideo({
        duration: 42.5,
        w: 100,
        h: 100,
        supportsStreaming: true,
      }),
    ],
  },
  ...overrides,
});

const buildContext = (
  overrides: Partial<{ channelId: string; cursor: string }> = {},
) => ({
  validatedData: {
    channelId: overrides.channelId ?? '-582839764',
    cursor: overrides.cursor,
  },
});

describe('listTelegramChannelVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTelegramClient).mockReturnValue(mockClient as any);
    mockClient.getInputEntity.mockResolvedValue({ resolved: true });
    mockClient.downloadMedia.mockResolvedValue(
      Buffer.from('thumb-bytes', 'utf8'),
    );
  });

  it('maps video messages, fetches thumbnails, and derives a nextCursor when the page is full', async () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      buildVideoMessage({ id: i + 1 }),
    );
    mockClient.getMessages.mockResolvedValue(messages);

    const result = await callList(buildContext());

    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.getInputEntity).toHaveBeenCalledWith('-582839764');
    expect(mockClient.getMessages).toHaveBeenCalledWith(
      { resolved: true },
      expect.objectContaining({
        limit: 20,
        offsetId: undefined,
        filter: expect.any(Api.InputMessagesFilterVideo),
      }),
    );

    expect(result.success).toBe(true);
    expect(result.dataObject.videos).toHaveLength(20);
    expect(result.dataObject.videos[0]).toEqual({
      id: '1',
      filename: 'clip.mp4',
      caption: 'a caption',
      date: new Date(1_700_000_000 * 1000).toISOString(),
      sizeBytes: 123456,
      durationSeconds: 42.5,
      thumbnailDataUri: `data:image/jpeg;base64,${Buffer.from('thumb-bytes').toString('base64')}`,
    });
    expect(result.dataObject.nextCursor).toBe('20');
  });

  it('omits nextCursor when fewer than a full page is returned', async () => {
    mockClient.getMessages.mockResolvedValue([buildVideoMessage()]);

    const result = await callList(buildContext());

    expect(result.dataObject.nextCursor).toBeUndefined();
  });

  it('passes cursor through as a numeric offsetId', async () => {
    mockClient.getMessages.mockResolvedValue([]);

    await callList(buildContext({ cursor: '42' }));

    expect(mockClient.getMessages).toHaveBeenCalledWith(
      { resolved: true },
      expect.objectContaining({ offsetId: 42 }),
    );
  });

  it('filters out messages with no video attachment', async () => {
    mockClient.getMessages.mockResolvedValue([
      buildVideoMessage({ video: undefined }),
    ]);

    const result = await callList(buildContext());

    expect(result.dataObject.videos).toHaveLength(0);
  });

  it('leaves thumbnailDataUri undefined when the thumbnail fetch fails, without failing the request', async () => {
    mockClient.downloadMedia.mockRejectedValue(new Error('download failed'));
    mockClient.getMessages.mockResolvedValue([buildVideoMessage()]);

    const result = await callList(buildContext());

    expect(result.success).toBe(true);
    expect(result.dataObject.videos[0].thumbnailDataUri).toBeUndefined();
  });

  it('skips the thumbnail fetch entirely when the document has no thumbs', async () => {
    mockClient.getMessages.mockResolvedValue([
      buildVideoMessage({
        video: { ...buildVideoMessage().video, thumbs: [] },
      }),
    ]);

    const result = await callList(buildContext());

    expect(mockClient.downloadMedia).not.toHaveBeenCalled();
    expect(result.dataObject.videos[0].thumbnailDataUri).toBeUndefined();
  });

  it('returns an error when the Telegram client fails', async () => {
    mockClient.connect.mockRejectedValue(new Error('connect failed'));

    const result = await callList(buildContext());

    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch channel videos',
    });
  });
});
