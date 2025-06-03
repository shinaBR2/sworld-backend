import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasuraClient } from '../../client';
import { getPlaylistVideos } from './index';
import { PlaylistDetailQuery } from '../../generated-graphql/graphql';

// Mock the hasura client
vi.mock('../../client', () => {
  const mockRequest = vi.fn();
  return {
    hasuraClient: {
      request: mockRequest,
    },
  };
});

describe('getPlaylistVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPlaylistId = '550e8400-e29b-41d4-a716-446655440000';

  const mockResponse: PlaylistDetailQuery = {
    playlist_by_pk: {
      playlist_videos: [
        {
          video: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            status: 'ready',
          },
        },
      ],
    },
  };

  it('should call hasuraClient.request with correct parameters', async () => {
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    await getPlaylistVideos(mockPlaylistId);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.stringContaining('query PlaylistDetail'),
      variables: {
        id: mockPlaylistId,
      },
    });
  });

  it('should return playlist_by_pk from the response', async () => {
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await getPlaylistVideos(mockPlaylistId);

    expect(result).toEqual(mockResponse);
  });

  it('should throw an error when hasuraClient.request fails', async () => {
    const mockError = new Error('GraphQL request failed');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(mockError);

    await expect(getPlaylistVideos(mockPlaylistId)).rejects.toThrow(mockError);
  });
});
