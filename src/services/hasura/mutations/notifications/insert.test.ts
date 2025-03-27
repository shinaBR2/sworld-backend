import { describe, expect, it, vi } from 'vitest';
import { hasuraClient } from '../client';
import { finishVideoProcess } from './insert';

vi.mock('../client', () => ({
  hasuraClient: {
    request: vi.fn(),
  },
}));

describe('finishVideoProcess', () => {
  const mockVariables = {
    taskId: '123e4567-e89b-12d3-a456-426614174000',
    notificationObject: {
      userId: 'user-123',
      type: 'VIDEO_PROCESSED',
      title: 'Video Processing Complete',
      description: 'Your video has been processed successfully',
    },
  };

  it('should update task and insert notification successfully', async () => {
    const mockResponse = {
      update_tasks: {
        affected_rows: 1,
        returning: [
          {
            id: 1,
          },
        ],
      },
      insert_notifications_one: {
        id: 'notification-123',
      },
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await finishVideoProcess(mockVariables);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.stringContaining('mutation FinalizeVideo'),
      variables: mockVariables,
    });
    expect(result).toBe('notification-123');
  });

  it('should return undefined when insert fails', async () => {
    const mockResponse = {
      update_tasks: {
        affected_rows: 1,
        returning: [
          {
            id: 1,
          },
        ],
      },
      insert_notifications_one: null,
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await finishVideoProcess(mockVariables);

    expect(result).toBeUndefined();
  });

  it('should throw error when request fails', async () => {
    const error = new Error('Database error');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(error);

    await expect(finishVideoProcess(mockVariables)).rejects.toThrow('Database error');
  });
});
