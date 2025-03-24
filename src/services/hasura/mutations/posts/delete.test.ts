import { describe, expect, it, vi } from 'vitest';
import { hasuraClient } from '../client';
import { deletePost } from './delete';

vi.mock('../client', () => ({
  hasuraClient: {
    request: vi.fn(),
  },
}));

describe('deletePost', () => {
  const mockId = '123e4567-e89b-12d3-a456-426614174000';

  it('should call hasura client with correct parameters', async () => {
    const mockResponse = {
      delete_posts_by_pk: { id: mockId },
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await deletePost(mockId);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.stringContaining('mutation DeletePost'),
      variables: {
        id: mockId,
      },
    });
    expect(result).toBe(mockId);
  });

  it('should return undefined when post is not found', async () => {
    const mockResponse = {
      delete_posts_by_pk: undefined,
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await deletePost(mockId);

    expect(result).toBeUndefined();
  });

  it('should throw error when hasura request fails', async () => {
    const error = new Error('Hasura error');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(error);

    await expect(deletePost(mockId)).rejects.toThrow('Hasura error');
  });
});
