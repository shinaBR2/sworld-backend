import { describe, expect, it, vi } from 'vitest';
import { crawl } from './index';
import { createRequestHandler } from './utils';
import { validateUrlInput } from './validator';

vi.mock('crawlee', () => ({
  PlaywrightCrawler: vi.fn(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('./utils', () => ({
  createRequestHandler: vi.fn(),
}));

vi.mock('./validator', () => ({
  validateUrlInput: vi.fn(),
}));

describe('crawl', () => {
  it('should crawl a URL and return results', async () => {
    const mockHandler = vi.fn();
    const mockState = {
      data: [{ title: 'Test' }],
      processedUrls: ['https://example.com'],
    };

    vi.mocked(validateUrlInput).mockReturnValue({
      handlerType: 'test',
      selectors: [],
    });

    vi.mocked(createRequestHandler).mockReturnValue({
      handler: mockHandler,
      initialState: mockState,
    });

    const result = await crawl(
      {
        url: 'https://example.com',
        getSingleVideo: false,
        title: 'Test',
        slugPrefix: 'test',
      },
      {}
    );

    expect(result).toEqual({
      data: mockState.data,
      urls: mockState.processedUrls,
    });
  });

  it('should pass validation error through', async () => {
    vi.mocked(validateUrlInput).mockImplementation(() => {
      throw new Error('Invalid URL');
    });

    await expect(
      crawl(
        {
          url: 'invalid-url',
          getSingleVideo: false,
          title: 'Test',
          slugPrefix: 'test',
        },
        {}
      )
    ).rejects.toThrow('Invalid URL');
  });
});
