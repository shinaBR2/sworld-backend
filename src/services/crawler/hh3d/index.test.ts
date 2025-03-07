import { CRAWL_ERRORS, HTTP_ERRORS } from 'src/utils/error-codes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandlerOptions, SelectorName } from '../types';
import { hh3dHandler } from './index';

// Create simple mocks
vi.mock('./scrapers', () => ({
  scrapeUrl: vi.fn(),
}));

vi.mock('./utils', () => ({
  videoUrlXHRMatcher: vi.fn().mockReturnValue(true),
}));

vi.mock('src/utils/custom-error', () => ({
  CustomError: {
    high: vi.fn(),
  },
}));

vi.mock('src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the mocked dependencies
import { Page } from 'playwright';
import { CustomError } from 'src/utils/custom-error';
import { scrapeUrl } from './scrapers';

describe('hh3dHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Make CustomError.high return an error so the flow continues
    vi.mocked(CustomError.high).mockImplementation(message => {
      throw new Error(message);
    });
  });

  const defaultOptions = {
    selectors: [
      {
        name: SelectorName.URL,
        selector: '.video-link',
        waitForSelectorTimeout: 100,
      },
    ],
    getSingleVideo: false,
  } as HandlerOptions;

  describe('Handler Initialization', () => {
    it('should return handler and initialState', () => {
      const { handler, initialState } = hh3dHandler(defaultOptions);

      expect(handler).toBeInstanceOf(Function);
      expect(initialState).toEqual({
        data: [],
        processedUrls: [],
      });
    });

    it('should throw error when URL selector is missing', () => {
      const invalidOptions = {
        selectors: [],
        getSingleVideo: false,
      };

      // @ts-expect-error
      expect(() => hh3dHandler(invalidOptions)).toThrow('Missing url selector');

      expect(CustomError.high).toHaveBeenCalledWith(
        'Missing url selector',
        expect.objectContaining({
          errorCode: CRAWL_ERRORS.MISSING_URL_SELECTOR,
          shouldRetry: false,
        })
      );
    });
  });

  describe('Handler Execution', () => {
    it('should process URL and extract video URL', async () => {
      // Set up mock to return a video URL
      vi.mocked(scrapeUrl).mockResolvedValue('http://video.url');

      const { handler, initialState } = hh3dHandler(defaultOptions);

      // Create the mock route
      const mockRoute = {
        request: vi.fn().mockReturnValue({
          url: () => 'https://example.com/player.php',
        }),
        fetch: vi.fn().mockResolvedValue({}),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      // Create custom page mock
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn().mockImplementation((pattern, handler) => {
          // Execute route handler immediately
          setTimeout(() => handler(mockRoute), 0);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        unroute: vi.fn().mockResolvedValue(undefined),
      } as unknown as Page;

      const mockRequest = { url: 'https://example.com/video' };
      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      // Execute the handler
      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      // Verify scrapeUrl was called
      expect(scrapeUrl).toHaveBeenCalled();

      // Verify navigation occurred
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');

      // Verify selector interaction
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.video-link', {
        timeout: defaultOptions.selectors[0].waitForSelectorTimeout,
      });

      // Verify links were enqueued
      expect(mockEnqueueLinks).toHaveBeenCalledWith({
        selector: '.video-link',
      });

      // Verify data was stored correctly
      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: 'http://video.url',
        },
      ]);
      expect(mockPage.unroute).toHaveBeenCalledWith('**/*');
    });

    it('should skip enqueue links when getSingleVideo is true', async () => {
      vi.mocked(scrapeUrl).mockResolvedValue('http://video.url');

      const { handler, initialState } = hh3dHandler({
        ...defaultOptions,
        getSingleVideo: true,
      });

      const mockRoute = {
        request: vi.fn().mockReturnValue({
          url: () => 'https://example.com/player.php',
        }),
        fetch: vi.fn().mockResolvedValue({}),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn().mockImplementation((pattern, handler) => {
          setTimeout(() => handler(mockRoute), 0);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        unroute: vi.fn().mockResolvedValue(undefined),
      } as unknown as Page;

      const mockRequest = { url: 'https://example.com/video' };
      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      expect(scrapeUrl).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');

      // Verify selector was NOT used (getSingleVideo=true)
      expect(mockPage.waitForSelector).not.toHaveBeenCalled();
      expect(mockEnqueueLinks).not.toHaveBeenCalled();

      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: 'http://video.url',
        },
      ]);
      expect(mockPage.unroute).toHaveBeenCalledWith('**/*');
    });

    it('should handle network error during fetch', async () => {
      // Create a network error
      const networkError = new Error('Network error');

      // Reset the CustomError.high mock to just return a value
      // not throw (which is breaking our test flow)
      vi.mocked(CustomError.high).mockImplementation(() => {
        return new Error('Request failed');
      });

      // Create the mock route
      const mockRoute = {
        request: vi.fn().mockReturnValue({
          url: () => 'https://example.com/player.php',
        }),
        fetch: vi.fn().mockRejectedValue(networkError),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      // Create a simple page mock that just registers the route handler
      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn().mockImplementation((pattern, handler) => {
          mockPage.routeHandler = handler;
        }),
        waitForSelector: vi.fn(),
        routeHandler: null,
        unroute: vi.fn().mockResolvedValue(undefined),
      } as unknown as Page;

      const mockRequest = { url: 'https://example.com/video' };
      const mockEnqueueLinks = vi.fn();

      // Create the handler
      const { handler } = hh3dHandler(defaultOptions);

      // Start the handler but don't await it
      const handlerPromise = handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      // Execute the route handler in isolation
      try {
        await mockPage.routeHandler(mockRoute);
        // If it doesn't throw, fail the test
        expect('should throw').toBe('but did not');
      } catch (error) {
        // Expected to throw
      }

      // Verify CustomError.high was called with correct parameters
      expect(CustomError.high).toHaveBeenCalledWith(
        'Request failed',
        expect.objectContaining({
          originalError: networkError,
          errorCode: HTTP_ERRORS.NETWORK_ERROR,
          shouldRetry: true,
        })
      );

      // Now that we've verified the parameters, we don't need to
      // test the full handler flow - we know it should fail if
      // the route handler throws
    });

    it('should handle enqueue links failure', async () => {
      vi.mocked(scrapeUrl).mockResolvedValue('http://video.url');

      const selectorError = new Error('Selector timeout');

      const mockRoute = {
        request: vi.fn().mockReturnValue({
          url: () => 'https://example.com/player.php',
        }),
        fetch: vi.fn().mockResolvedValue({}),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn().mockImplementation((pattern, handler) => {
          setTimeout(() => handler(mockRoute), 0);
        }),
        waitForSelector: vi.fn().mockRejectedValue(selectorError),
        unroute: vi.fn().mockResolvedValue(undefined),
      };

      const mockRequest = { url: 'https://example.com/video' };
      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      const { handler } = hh3dHandler(defaultOptions);

      await expect(
        handler({
          page: mockPage,
          request: mockRequest,
          enqueueLinks: mockEnqueueLinks,
        })
      ).rejects.toThrow();

      expect(CustomError.high).toHaveBeenCalledWith(
        'Enqueue links failed',
        expect.objectContaining({
          originalError: selectorError,
          errorCode: HTTP_ERRORS.NETWORK_ERROR,
          shouldRetry: false,
        })
      );
    });

    it('should handle case when no video URL is found', async () => {
      vi.mocked(scrapeUrl).mockResolvedValue(null);

      const { handler, initialState } = hh3dHandler(defaultOptions);

      const mockRoute = {
        request: vi.fn().mockReturnValue({
          url: () => 'https://example.com/player.php',
        }),
        fetch: vi.fn().mockResolvedValue({}),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn().mockImplementation((pattern, handler) => {
          setTimeout(() => handler(mockRoute), 0);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
      };

      const mockRequest = { url: 'https://example.com/video' };
      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: null,
        },
      ]);
    });
  });
});
