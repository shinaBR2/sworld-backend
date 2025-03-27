import { describe, expect, it, vi } from 'vitest';
import { hasuraClient } from '../client';
import { insertPost } from './insert';

vi.mock('../client', () => ({
  hasuraClient: {
    request: vi.fn(),
  },
}));

describe('insertPost', () => {
  const mockNotification = {
    userId: 'user-123',
    type: 'POST_CREATED',
    title: 'New Post',
    description: 'Your post has been created successfully',
  };

  it('should insert notification successfully', async () => {
    const mockResponse = {
      insert_notifications_one: {
        id: 'notification-123',
      },
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await insertPost(mockNotification);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.stringContaining('mutation InsertNotification'),
      variables: {
        object: mockNotification,
      },
    });
    expect(result).toBe('notification-123');
  });

  it('should return undefined when insert fails', async () => {
    const mockResponse = {
      insert_notifications_one: null,
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await insertPost(mockNotification);

    expect(result).toBeUndefined();
  });

  it('should throw error when request fails', async () => {
    const error = new Error('Database error');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(error);

    await expect(insertPost(mockNotification)).rejects.toThrow('Database error');
  });
});
