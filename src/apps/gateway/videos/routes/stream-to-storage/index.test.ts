import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { envConfig } from 'src/utils/envConfig';
import { AppError } from 'src/utils/schema';
import { createCloudTasks } from 'src/utils/cloud-task';
import { verifySignature } from 'src/services/videos/convert/validator';
import { streamToStorage } from './index';

// Mock dependencies
vi.mock('src/utils/envConfig', () => ({
  envConfig: {
    computeServiceUrl: 'http://test-compute-service',
  },
}));

vi.mock('src/utils/schema', () => ({
  AppError: vi.fn((message, details) => {
    const error = new Error(message);
    (error as any).details = details;
    return error;
  }),
  AppResponse: vi.fn((success, message, data) => ({ success, message, data })),
}));

vi.mock('src/utils/cloud-task', () => ({
  createCloudTasks: vi.fn(),
}));

vi.mock('src/services/videos/convert/validator', () => ({
  verifySignature: vi.fn(),
}));

describe('streamToStorage', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    vi.mocked(envConfig).computeServiceUrl = 'http://test-compute-service';
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(createCloudTasks).mockResolvedValue({ taskId: 'test-task' });

    // Setup request and response mocks
    mockReq = {
      validatedData: {
        signatureHeader: 'test-signature',
        event: {
          data: { videoId: 'test-video' },
          metadata: { id: 'test-event' },
        },
      },
    };

    mockRes = {
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should create cloud task when signature is valid', async () => {
    await streamToStorage(mockReq, mockRes as Response);

    expect(createCloudTasks).toHaveBeenCalledWith({
      url: 'http://test-compute-service/videos/convert-handler',
      queue: 'convert-video',
      payload: mockReq.validatedData.event,
    });

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'ok',
        data: { taskId: 'test-task' },
      })
    );
  });

  it('should throw error when signature is invalid', async () => {
    vi.mocked(verifySignature).mockReturnValue(false);

    await expect(streamToStorage(mockReq, mockRes as Response)).rejects.toThrow(
      'Invalid webhook signature for event'
    );
    expect(createCloudTasks).not.toHaveBeenCalled();
  });

  it('should throw error when compute service URL is missing', async () => {
    const mockEnvConfig = vi.mocked(envConfig);
    mockEnvConfig.computeServiceUrl = undefined;

    await expect(streamToStorage(mockReq, mockRes as Response)).rejects.toThrow(
      'Missing environment variable: computeServiceUrl'
    );
    expect(createCloudTasks).not.toHaveBeenCalled();
  });

  it('should handle cloud task creation failure', async () => {
    const error = new Error('Task creation failed');
    vi.mocked(createCloudTasks).mockRejectedValue(error);

    await expect(streamToStorage(mockReq, mockRes as Response)).rejects.toThrow(
      'Failed to create conversion task'
    );

    expect(AppError).toHaveBeenCalledWith(
      'Failed to create conversion task',
      expect.objectContaining({
        eventId: mockReq.validatedData.event.metadata.id,
        error,
      })
    );
  });
});
