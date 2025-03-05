import { describe, it, expect, vi } from 'vitest';

// Mock types to simulate Crawlee types
type MockPage = {
  goto: (url: string) => Promise<void>;
  route: (pattern: string, handler: (route: any) => Promise<void>) => void;
  waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<void>;
};

// Import the actual handler
import { hh3dHandler } from './index';

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

      // Create mock implementations
      const mockPage: MockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn((pattern, routeHandler) => {
          // Simulate route interception
          const mockRoute = {
            request: () => ({
              url: vi.fn().mockReturnValue('https://example.com/wp-content/themes/halimmovies/player.php'),
            }),
            fetch: vi.fn().mockResolvedValue({
              text: vi.fn().mockResolvedValue(JSON.stringify({ file: 'http://video.url' })),
            }),
            continue: vi.fn().mockResolvedValue(undefined),
          };
          routeHandler(mockRoute);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
      };

      const mockRequest = {
        url: 'https://example.com/video',
      };

      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      // Create the handler promise
      const handlerPromise = handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      // Wait for handler to complete
      await handlerPromise;

      // Verify page navigation
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');

      // Verify state update
      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: 'http://video.url',
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      // Verify selector handling
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(defaultOptions.selector, {
        timeout: defaultOptions.waitForSelectorTimeout,
      });
      expect(mockEnqueueLinks).toHaveBeenCalledWith({ selector: defaultOptions.selector });
    });

    it('should handle JSON parsing error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { handler, initialState } = hh3dHandler(defaultOptions);

      // Modify Promise.race to resolve immediately
      const originalRace = Promise.race;
      Promise.race = vi.fn().mockResolvedValue(null);

      // Create mock implementations
      const mockPage: MockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn((pattern, routeHandler) => {
          // Simulate route interception
          const mockRoute = {
            request: () => ({
              url: vi.fn().mockReturnValue('https://example.com/wp-content/themes/halimmovies/player.php'),
            }),
            fetch: vi.fn().mockResolvedValue({
              text: vi.fn().mockResolvedValue('Invalid JSON'), // Deliberately invalid JSON
            }),
            continue: vi.fn().mockResolvedValue(undefined),
          };
          routeHandler(mockRoute);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
      };

      const mockRequest = {
        url: 'https://example.com/video',
      };

      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error');

      // Create the handler promise
      const handlerPromise = handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      // Wait for handler to complete
      await handlerPromise;

      // Restore original Promise.race
      Promise.race = originalRace;

      // Verify page navigation still occurred
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');

      // Verify state update with null videoUrl
      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: null,
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      // Verify console error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing JSON response:', expect.any(Error));

      // Verify selector handling
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(defaultOptions.selector, {
        timeout: defaultOptions.waitForSelectorTimeout,
      });
      expect(mockEnqueueLinks).toHaveBeenCalledWith({ selector: defaultOptions.selector });
    });

    it('should handle timeout when no video URL is found', async () => {
      const { handler, initialState } = hh3dHandler(defaultOptions);

      // Mock Promise.race to resolve with null
      const originalRace = Promise.race;
      Promise.race = vi.fn().mockResolvedValue(null);

      // Create mock implementations
      const mockPage: MockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        route: vi.fn((pattern, routeHandler) => {
          // Simulate route interception without resolving video URL
          const mockRoute = {
            request: () => ({
              url: vi.fn().mockReturnValue('https://example.com/wp-content/themes/halimmovies/player.php'),
            }),
            fetch: vi.fn().mockResolvedValue({
              text: vi.fn().mockResolvedValue('{}'), // Empty object to avoid JSON parsing error
            }),
            continue: vi.fn().mockResolvedValue(undefined),
          };
          routeHandler(mockRoute);
        }),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
      };

      const mockRequest = {
        url: 'https://example.com/video',
      };

      const mockEnqueueLinks = vi.fn().mockResolvedValue(undefined);

      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create the handler promise
      const handlerPromise = handler({
        page: mockPage,
        request: mockRequest,
        enqueueLinks: mockEnqueueLinks,
      });

      // Wait for handler to complete
      await handlerPromise;

      // Restore original Promise.race
      Promise.race = originalRace;

      // Verify page navigation still occurred
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/video');

      // Verify state update with null videoUrl due to timeout
      expect(initialState.data).toEqual([
        {
          url: 'https://example.com/video',
          videoUrl: null,
        },
      ]);
      expect(initialState.processedUrls).toContain('https://example.com/video');

      // Verify selector handling
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(defaultOptions.selector, {
        timeout: defaultOptions.waitForSelectorTimeout,
      });
      expect(mockEnqueueLinks).toHaveBeenCalledWith({ selector: defaultOptions.selector });
    });
  });
});
