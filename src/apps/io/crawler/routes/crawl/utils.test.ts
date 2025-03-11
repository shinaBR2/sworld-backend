import { describe, expect, it } from 'vitest';
import { CrawlData, CrawlParams } from './type';
import { buildVariables } from './utils';

describe('buildVariables', () => {
  const mockUserId = 'user-123';
  const mockTitle = 'Test Video';
  const mockSlugPrefix = 'test-';

  const mockResult: { data: CrawlData[] } = {
    data: [{ videoUrl: 'https://example.com/video1' }, { videoUrl: 'https://example.com/video2' }],
  };

  // The crawler process should take care the result
  // to have only one videoUrl
  it('should build variables for single video', () => {
    const params: CrawlParams = {
      getSingleVideo: true,
      title: mockTitle,
      slugPrefix: mockSlugPrefix,
      userId: mockUserId,
    };

    const result = buildVariables(mockResult, params);

    expect(result).toEqual([
      {
        title: mockTitle,
        slug: 'test-1',
        video_url: 'https://example.com/video1',
        user_id: mockUserId,
      },
      {
        title: mockTitle,
        slug: 'test-2',
        video_url: 'https://example.com/video2',
        user_id: mockUserId,
      },
    ]);
  });

  it('should build variables for playlist videos', () => {
    const params: CrawlParams = {
      getSingleVideo: false,
      title: mockTitle,
      slugPrefix: mockSlugPrefix,
      userId: mockUserId,
    };

    const result = buildVariables(mockResult, params);

    expect(result).toEqual([
      {
        title: 'Test Video - 1',
        slug: 'test-1',
        video_url: 'https://example.com/video1',
        user_id: mockUserId,
      },
      {
        title: 'Test Video - 2',
        slug: 'test-2',
        video_url: 'https://example.com/video2',
        user_id: mockUserId,
      },
    ]);
  });

  it('should handle empty data array', () => {
    const params: CrawlParams = {
      getSingleVideo: true,
      title: mockTitle,
      slugPrefix: mockSlugPrefix,
      userId: mockUserId,
    };

    const emptyResult = { data: [] };
    const result = buildVariables(emptyResult, params);

    expect(result).toEqual([]);
  });
});
