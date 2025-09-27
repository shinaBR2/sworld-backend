import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pino
vi.mock('pino', () => ({
  default: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis(),
  })),
  pino: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis(),
  })),
}));

// Mock pino-http
const mockPinoHttp = vi.fn().mockImplementation((options) => {
  // Store options for assertions
  (mockPinoHttp as any).lastOptions = options;
  // Return a middleware function that immediately calls next()
  return (req: any, res: any, next: () => void) => {
    next();
  };
});
(mockPinoHttp as any).lastOptions = {};

vi.mock('pino-http', () => ({
  default: mockPinoHttp,
}));

// Mock node:async_hooks
const mockGetStore = vi.fn();
const mockRun = vi.fn((_store: unknown, callback: () => void) => callback());
vi.mock('node:async_hooks', () => ({
  AsyncLocalStorage: vi.fn(() => ({
    getStore: mockGetStore,
    run: mockRun,
  })),
}));

describe('logger', () => {
  let loggerModule: typeof import('.');

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import the module to reset state
    loggerModule = await import('.');
  });

  describe('getCurrentLogger', () => {
    it('should return a logger instance with expected methods', () => {
      const logger = loggerModule.getCurrentLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });
  });

  describe('createHonoLoggingMiddleware', () => {
    it('should create middleware with production config', async () => {
      // Mock the pino-http middleware to call next immediately
      const mockNext = vi.fn();

      const middleware = loggerModule.createHonoLoggingMiddleware({
        nodeEnv: 'production',
      });

      expect(typeof middleware).toBe('function');

      // Create a promise that resolves when next is called
      const nextCalled = new Promise<void>((resolve) => {
        middleware(
          {
            var: { requestId: 'test-request-123' },
            env: { incoming: {}, outgoing: {} },
            req: { headers: {} },
            res: {},
          },
          () => {
            mockNext();
            resolve();
          },
        );
      });

      // Wait for next to be called or timeout after 1s
      await Promise.race([
        nextCalled,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);

      expect(mockPinoHttp).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sensitive data redaction', () => {
    it('should redact sensitive fields', async () => {
      // Mock the pino-http middleware to capture options
      const middleware = loggerModule.createHonoLoggingMiddleware({
        nodeEnv: 'test',
      });

      // Create a promise that resolves when next is called
      const nextCalled = new Promise<void>((resolve) => {
        middleware(
          {
            var: { requestId: 'test-request-123' },
            env: { incoming: {}, outgoing: {} },
            req: { headers: {} },
            res: {},
          },
          resolve,
        );
      });

      // Wait for next to be called or timeout after 1s
      await Promise.race([
        nextCalled,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);

      const pinoHttpOptions = (mockPinoHttp as any).lastOptions;
      expect(pinoHttpOptions).toBeDefined();
      expect(pinoHttpOptions.redact).toBeDefined();

      const sensitiveFields = [
        'req.headers["authorization"]',
        'req.headers["x-signature"]',
        'req.headers["x-hub-signature"]',
        'req.headers["x-webhook-signature"]',
        'req.body.*.token',
        'req.body.*.password',
        'req.body.*.secret',
        'req.body.*.key',
      ];

      sensitiveFields.forEach((field) => {
        expect(pinoHttpOptions.redact).toContain(field);
      });
    });
  });
});
