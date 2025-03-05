import { describe, it, expect, vi } from 'vitest';
import { hh3dHandler } from './index';

// Mock types to simulate Crawlee types
type MockPage = {
  goto: (url: string) => Promise<void>;
  route: (pattern: string, handler: (route: any) => Promise<void>) => void;
  waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<void>;
};

const createMockPage = (routeHandler: (route: any) => void) => ({
  goto: vi.fn().mockResolvedValue(undefined),
  route: vi.fn((pattern, handler) => {
    const mockRoute = {
      request: () => ({
        url: vi.fn().mockReturnValue('https://example.com/wp-content/themes/halimmovies/player.php'),
      }),
      fetch: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('{}'),
      }),
      continue: vi.fn().mockResolvedValue(undefined),
    };
    routeHandler(mockRoute);
  }),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
});

const setupTest = (handler: (route: any) => void, fetchText: () => string = () => '{}') => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    route: vi.fn((pattern, routeCallback) => {
      const mockRoute = {
        request: () => ({
          url: vi.fn().mockReturnValue('https://example.com/wp-content/themes/halimmovies/player.php'),
        }),
        fetch: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(fetchText()),
        }),
        continue: vi.fn().mockResolvedValue(undefined),
      };

      // Directly call the route handler with the mock route
      routeCallback(mockRoute);
    }),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
  };

  const mockRequest = { url: 'https://example.com/video' };
  const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

  return { mockPage, mockRequest, mockEnqueueLinks };
};

const verifyCommonHandlerBehavior = (
  mockPage: MockPage,
  mockEnqueueLinks: jest.Mock,
  initialState: any,
  options: any
) => {
  expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');
  expect(mockPage.waitForSelector).toHaveBeenCalledWith(options.selector, {
    timeout: options.waitForSelectorTimeout,
  });
  expect(mockEnqueueLinks).toHaveBeenCalledWith({ selector: options.selector });
};

describe('hh3dHandler', () => {
  const defaultOptions = {
    selector: '.video-link',
    waitForSelectorTimeout: 5000,
  };

  describe('Handler Initialization', () => {
    it('should return handler and initialState', () => {
      const { handler, initialState } = hh3dHandler(defaultOptions);

      expect(handler).toBeInstanceOf(Function);
      expect(initialState).toEqual({
        data: [],
        processedUrls: [],
      });
    });
  });

  describe('Handler Execution', () => {
    it('should process URL and extract video URL', async () => {
      const { handler, initialState } = hh3dHandler(defaultOptions);

      const { mockPage, mockRequest, mockEnqueueLinks } = setupTest(
        mockRoute => {
          mockRoute.fetch = vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue(JSON.stringify({ file: 'http://video.url' })),
          });
        },
        () => JSON.stringify({ file: 'http://video.url' })
      );

      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: 'http://video.url',
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      verifyCommonHandlerBehavior(mockPage, mockEnqueueLinks, initialState, defaultOptions);
    });

    it('should handle JSON parsing error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { handler, initialState } = hh3dHandler(defaultOptions);

      const originalRace = Promise.race;
      Promise.race = vi.fn().mockResolvedValue(null);

      const { mockPage, mockRequest, mockEnqueueLinks } = setupTest(
        mockRoute => {
          mockRoute.fetch = vi.fn().mockResolvedValue({
            text: vi.fn().mockResolvedValue('Invalid JSON'),
          });
        },
        () => 'Invalid JSON'
      );

      const consoleErrorSpy = vi.spyOn(console, 'error');

      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      Promise.race = originalRace;

      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: null,
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing JSON response:', expect.any(Error));

      verifyCommonHandlerBehavior(mockPage, mockEnqueueLinks, initialState, defaultOptions);
    });

    it('should handle timeout when no video URL is found', async () => {
      const { handler, initialState } = hh3dHandler(defaultOptions);

      const originalRace = Promise.race;
      Promise.race = vi.fn().mockResolvedValue(null);

      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { mockPage, mockRequest, mockEnqueueLinks } = setupTest(mockRoute => {
        mockRoute.fetch = vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{}'),
        });
      });

      await handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      Promise.race = originalRace;

      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: null,
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      verifyCommonHandlerBehavior(mockPage, mockEnqueueLinks, initialState, defaultOptions);
    });
  });
});
