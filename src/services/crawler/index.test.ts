import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { crawl } from './index';
import { createRequestHandler, getHandlerType } from './utils';
import { crawlConfig } from 'src/utils/systemConfig';

// Mock dependencies
vi.mock('crawlee', () => ({
  PlaywrightCrawler: vi.fn(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('./utils', () => ({
  createRequestHandler: vi.fn(),
  getHandlerType: vi.fn(),
}));

vi.mock('src/utils/systemConfig', () => ({
  crawlConfig: {
    defaultWaitForSelectorTimeout: 10000,
  },
}));

describe('crawl', () => {
  const mockHandler = vi.fn();
  const mockInitialState = {
    data: [{ title: 'Test Item' }],
    processedUrls: ['https://example.com/page1'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(createRequestHandler).mockReturnValue({
      handler: mockHandler,
      initialState: mockInitialState,
    });

    vi.mocked(getHandlerType).mockReturnValue('default');
  });

  it('should create a crawler with correct configuration', async () => {
    const startUrls = ['https://example.com'];
    const options = {
      maxRequestsPerCrawl: 10,
      selector: '.item',
      waitForSelectorTimeout: 5000,
    };

    await crawl(startUrls, options);

    // Verify getHandlerType was called with startUrls
    expect(getHandlerType).toHaveBeenCalledWith(startUrls);

    // Verify createRequestHandler was called with correct parameters
    expect(createRequestHandler).toHaveBeenCalledWith('default', {
      selector: '.item',
      waitForSelectorTimeout: 5000,
    });

    // Verify crawler was initialized correctly
    expect(PlaywrightCrawler).toHaveBeenCalledWith({
      maxRequestsPerCrawl: 10,
      requestHandler: mockHandler,
    });

    // Get the crawler instance and verify run was called
    const crawlerInstance = vi.mocked(PlaywrightCrawler).mock.results[0].value;
    expect(crawlerInstance.run).toHaveBeenCalledWith(startUrls);
  });

  it('should use provided handlerType instead of determining it', async () => {
    const startUrls = ['https://example.com'];
    const options = {
      handlerType: 'custom',
    };

    await crawl(startUrls, options);

    // Verify getHandlerType was not called
    expect(getHandlerType).not.toHaveBeenCalled();

    // Verify createRequestHandler was called with custom handler type
    expect(createRequestHandler).toHaveBeenCalledWith('custom', {
      selector: undefined,
      waitForSelectorTimeout: crawlConfig.defaultWaitForSelectorTimeout,
    });
  });

  it('should use default timeout when not specified', async () => {
    const startUrls = ['https://example.com'];
    const options = {
      selector: '.item',
    };

    await crawl(startUrls, options);

    // Verify default timeout was used
    expect(createRequestHandler).toHaveBeenCalledWith('default', {
      selector: '.item',
      waitForSelectorTimeout: crawlConfig.defaultWaitForSelectorTimeout,
    });
  });

  it('should return data and processed URLs from the handler state', async () => {
    const startUrls = ['https://example.com'];
    const result = await crawl(startUrls, {});

    expect(result).toEqual({
      data: mockInitialState.data,
      urls: mockInitialState.processedUrls,
    });
  });
});
