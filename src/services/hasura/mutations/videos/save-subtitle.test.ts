import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveSubtitleMutation } from '../../generated-graphql/graphql';
import { hasuraClient } from '../../client';
import { SubtitleInput, saveSubtitle } from './save-subtitle';

// Mock GraphQL client
vi.mock('../../client', () => ({
  hasuraClient: {
    request: vi.fn(),
  },
}));

describe('saveSubtitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSubtitleId = 'subtitle-123';
  const mockSubtitleInput: SubtitleInput = {
    video_id: 'video-123',
    language: 'en',
    url: 'https://example.com/subtitle.vtt',
    storage_path: 'videos/user123/video-123/en.vtt',
    is_default: true,
    created_by: 'user123',
  };

  const mockResponse: SaveSubtitleMutation = {
    update_subtitles_by_pk: {
      id: mockSubtitleId,
    },
  };

  it('should call hasuraClient.request with correct parameters', async () => {
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    await saveSubtitle(mockSubtitleId, mockSubtitleInput);

    expect(hasuraClient.request).toHaveBeenCalledWith({
      document: expect.any(String),
      variables: {
        id: mockSubtitleId,
        object: mockSubtitleInput,
      },
    });
  });

  it('should return update_subtitles_by_pk from the response', async () => {
    vi.mocked(hasuraClient.request).mockResolvedValueOnce(mockResponse);

    const result = await saveSubtitle(mockSubtitleId, mockSubtitleInput);

    expect(result).toEqual(mockResponse.update_subtitles_by_pk);
  });

  it('should throw an error when hasuraClient.request fails', async () => {
    const mockError = new Error('GraphQL request failed');
    vi.mocked(hasuraClient.request).mockRejectedValueOnce(mockError);

    await expect(saveSubtitle(mockSubtitleId, mockSubtitleInput)).rejects.toThrow(mockError);
  });
});
