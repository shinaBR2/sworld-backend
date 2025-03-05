import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { crawl } from './index';
import { createRequestHandler, getHandlerType } from './utils';
import { crawlConfig } from 'src/utils/systemConfig';
import { SelectorConfig } from './types';

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

  it('should throw error for missing selectors', async () => {
    const startUrls = ['URL_ADDRESS'];
    const options = {
      handlerType: 'invalid',
    };

    await expect(crawl(startUrls, options)).rejects.toThrowError('Invalid handler type or selectors provided');

    // Verify getHandlerType was called with startUrls
    expect(getHandlerType).not.toHaveBeenCalledWith(startUrls);
    expect(createRequestHandler).not.toHaveBeenCalled();
  });
  it('should throw error for invalid handler type', async () => {
    const startUrls = ['URL_ADDRESS'];
    const selectors: SelectorConfig[] = [
      { selector: 'h1', name: 'title', required: true, waitForSelectorTimeout: 3000 },
      { selector: '.description', name: 'description', required: false, waitForSelectorTimeout: 3000 },
      { selector: '.thumbnail img', name: 'thumbnailUrl', required: true, waitForSelectorTimeout: 3000 },
    ];
    const options = {
      selectors,
    };
    vi.mocked(getHandlerType).mockReturnValue('');

    await expect(crawl(startUrls, options)).rejects.toThrowError('Invalid handler type or selectors provided');

    expect(createRequestHandler).not.toHaveBeenCalled();
  });

  it('should create a crawler with correct configuration', async () => {
    const startUrls = ['https://example.com'];
    const selectors: SelectorConfig[] = [
      { selector: 'h1', name: 'title', required: true, waitForSelectorTimeout: 3000 },
      { selector: '.description', name: 'description', required: false, waitForSelectorTimeout: 3000 },
      { selector: '.thumbnail img', name: 'thumbnailUrl', required: true, waitForSelectorTimeout: 3000 },
    ];
    const options = {
      maxRequestsPerCrawl: 10,
      selectors,
    };

    await crawl(startUrls, options);

    // Verify getHandlerType was called with startUrls
    expect(getHandlerType).toHaveBeenCalledWith(startUrls);

    // Verify createRequestHandler was called with correct parameters
    expect(createRequestHandler).toHaveBeenCalledWith('default', {
      selectors,
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
    const selectors: SelectorConfig[] = [
      { selector: 'h1', name: 'title', required: true, waitForSelectorTimeout: 3000 },
      { selector: '.description', name: 'description', required: false, waitForSelectorTimeout: 3000 },
      { selector: '.thumbnail img', name: 'thumbnailUrl', required: true, waitForSelectorTimeout: 3000 },
    ];
    const options = {
      handlerType: 'custom',
      selectors,
    };

    await crawl(startUrls, options);

    // Verify getHandlerType was not called
    expect(getHandlerType).not.toHaveBeenCalled();

    // Verify createRequestHandler was called with custom handler type
    expect(createRequestHandler).toHaveBeenCalledWith('custom', {
      selectors,
    });
  });

  it('should use default timeout when not specified', async () => {
    const startUrls = ['https://example.com'];
    const selectors: SelectorConfig[] = [
      { selector: 'h1', name: 'title', required: true },
      { selector: '.description', name: 'description', required: false },
    ];
    const options = {
      selectors,
    };

    await crawl(startUrls, options);

    // Verify default timeout was used
    expect(createRequestHandler).toHaveBeenCalledWith('default', {
      selectors: [
        {
          selector: 'h1',
          name: 'title',
          required: true,
          waitForSelectorTimeout: crawlConfig.defaultWaitForSelectorTimeout,
        },
        {
          selector: '.description',
          name: 'description',
          required: false,
          waitForSelectorTimeout: crawlConfig.defaultWaitForSelectorTimeout,
        },
      ],
    });
  });

  it('should return data and processed URLs from the handler state', async () => {
    const startUrls = ['https://example.com'];
    const result = await crawl(startUrls, {
      selectors: [
        { selector: 'h1', name: 'title', required: true, waitForSelectorTimeout: 3000 },
        { selector: '.description', name: 'description', required: false, waitForSelectorTimeout: 3000 },
      ],
    });

    expect(result).toEqual({
      data: mockInitialState.data,
      urls: mockInitialState.processedUrls,
    });
  });
});
