import { describe, expect, it, vi } from 'vitest';
import { hasuraClient } from '../client';
import { updatePost } from './update';

vi.mock('../client', () => ({
  hasuraClient: {
    request: vi.fn(),
  },
}));

describe('updatePost', () => {
  const mockId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPost = {
    title: 'Updated Title',
    content: 'Updated Content',
  };

  it('should call hasura client with correct parameters', async () => {
    const mockResponse = {
      update_posts_by_pk: { id: mockId },
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await updatePost(mockId, mockPost);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.stringContaining('mutation UpdatePost'),
      variables: {
        id: mockId,
        set: mockPost,
      },
    });
    expect(result).toBe(mockId);
  });

  it('should return undefined when post is not found', async () => {
    const mockResponse = {
      update_posts_by_pk: undefined,
    };
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await updatePost(mockId, mockPost);

    expect(result).toBeUndefined();
  });

  it('should throw error when hasura request fails', async () => {
    const error = new Error('Hasura error');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(error);

    await expect(updatePost(mockId, mockPost)).rejects.toThrow('Hasura error');
  });
});
