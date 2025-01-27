import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videosRouter } from './index';
import { convertVideo } from 'src/services/videos/convert/handler';
import { logger } from 'src/utils/logger';
import { Request, Response } from 'express';

vi.mock('src/services/videos/convert/handler', () => ({
  convertVideo: vi.fn(),
}));

vi.mock('src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe('videosRouter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      body: {
        data: {
          id: 'video-123',
        },
        metadata: {
          id: 'event-123',
        },
      },
    };
    mockRes = {
      json: vi.fn(),
    };
  });

  it('should process video conversion successfully', async () => {
    const mockVideo = { id: 'video-123', status: 'converted' };
    vi.mocked(convertVideo).mockResolvedValueOnce(mockVideo);

    const route = videosRouter.stack[0].route;
    const handler = route.stack[0].handle;

    await handler(mockReq as Request, mockRes as Response);

    expect(logger.info).toHaveBeenCalledWith(
      mockReq.body.metadata,
      expect.stringContaining('start processing event')
    );
    expect(convertVideo).toHaveBeenCalledWith(mockReq.body.data);
    expect(mockRes.json).toHaveBeenCalledWith(mockVideo);
  });

  it('should throw AppError when conversion fails', async () => {
    const error = new Error('Conversion failed');
    vi.mocked(convertVideo).mockRejectedValueOnce(error);

    const route = videosRouter.stack[0].route;
    const handler = route.stack[0].handle;

    await expect(
      handler(mockReq as Request, mockRes as Response)
    ).rejects.toThrow('Video conversion failed');

    expect(logger.info).toHaveBeenCalled();
    expect(convertVideo).toHaveBeenCalled();
  });

  it('should have correct route configuration', () => {
    const route = videosRouter.stack[0].route;
    expect(route.path).toBe('/convert-handler');
    expect(route.methods.post).toBe(true);
  });
});
