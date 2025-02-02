import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { streamHLSHandler } from './index';
import { streamM3U8 } from 'src/services/videos/helpers/m3u8';
import { logger } from 'src/utils/logger';
import { StreamHandlerRequest } from './schema';

vi.mock('src/services/videos/helpers/m3u8', () => ({
  streamM3U8: vi.fn(),
}));

vi.mock('src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock('src/utils/schema', () => ({
  AppError: vi.fn((message: string, details: object) => ({
    message,
    details,
  })),
}));

interface MockResponse extends Response {
  json: vi.Mock;
}

const createMockResponse = (): MockResponse =>
  ({
    json: vi.fn(),
  }) as unknown as MockResponse;

const createMockRequest = (
  data: any = {},
  metadata: any = {}
): StreamHandlerRequest =>
  ({
    body: {
      data,
      metadata,
    },
  }) as StreamHandlerRequest;

describe('streamHLSHandler', () => {
  let mockRequest: StreamHandlerRequest;
  let mockResponse: MockResponse;

  const defaultData = {
    id: 'video123',
    videoUrl: 'https://example.com/video.mp4',
    userId: 'user123',
  };

  const defaultMetadata = {
    id: 'event123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = createMockRequest(defaultData, defaultMetadata);
    mockResponse = createMockResponse();
  });

  it('should successfully process video and return playable URL', async () => {
    const expectedPlayableUrl = 'https://example.com/video.m3u8';
    vi.mocked(streamM3U8).mockResolvedValueOnce(expectedPlayableUrl);

    await streamHLSHandler(mockRequest, mockResponse);

    expect(streamM3U8).toHaveBeenCalledWith(
      defaultData.videoUrl,
      `videos/${defaultData.userId}/${defaultData.id}`
    );
    expect(logger.info).toHaveBeenCalledWith(
      defaultMetadata,
      `[/videos/stream-hls-handler] start processing event "${defaultMetadata.id}", video "${defaultData.id}"`
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      playableVideoUrl: expectedPlayableUrl,
    });
  });

  it('should throw AppError when streamM3U8 fails', async () => {
    const errorMessage = 'Conversion failed';
    vi.mocked(streamM3U8).mockRejectedValueOnce(new Error(errorMessage));

    await expect(
      streamHLSHandler(mockRequest, mockResponse)
    ).rejects.toMatchObject({
      message: 'Video conversion failed',
      details: {
        videoId: defaultData.id,
        error: errorMessage,
      },
    });

    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should log event start with correct metadata', async () => {
    vi.mocked(streamM3U8).mockResolvedValueOnce('some-url');

    await streamHLSHandler(mockRequest, mockResponse);

    expect(logger.info).toHaveBeenCalledWith(
      defaultMetadata,
      expect.stringContaining(defaultData.id)
    );
    expect(logger.info).toHaveBeenCalledWith(
      defaultMetadata,
      expect.stringContaining(defaultMetadata.id)
    );
  });

  it('should construct correct output path', async () => {
    const customData = {
      id: 'custom-video',
      videoUrl: 'https://example.com/custom.mp4',
      userId: 'custom-user',
    };
    const customRequest = createMockRequest(customData, defaultMetadata);

    vi.mocked(streamM3U8).mockResolvedValueOnce('some-url');

    await streamHLSHandler(customRequest, mockResponse);

    expect(streamM3U8).toHaveBeenCalledWith(
      customData.videoUrl,
      `videos/${customData.userId}/${customData.id}`
    );
  });
});

interface TestHelpers {
  createMockRequest: typeof createMockRequest;
  createMockResponse: typeof createMockResponse;
}

export { TestHelpers };
