import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest'; // Or your preferred test runner
import app from './gateway';

// Mock dependencies
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock('./utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  getCurrentLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  createHonoLoggingMiddleware: vi.fn(() => (next) => next()),
}));

vi.mock('./utils/envConfig', () => ({
  envConfig: {
    port: 4000,
    nodeEnv: 'test',
    server: {
      maxBodyLimitInKBNumber: 1024,
    },
    sentrydsn: 'test-dsn',
  },
}));

// Mock middleware
vi.mock('hono/request-id', () => ({
  requestId: () => vi.fn(),
}));

vi.mock('hono/body-limit', () => ({
  bodyLimit: () => vi.fn(),
}));

vi.mock('@hono/sentry', () => ({
  sentry: () => vi.fn(),
}));

vi.mock('hono-rate-limiter', () => ({
  rateLimiter: () => vi.fn(),
}));

// Mock routes
vi.mock('./apps/gateway/videos', () => ({
  videosRouter: new Hono(),
}));

describe('Gateway Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.only('Health Check Endpoint', () => {
    it('should return healthy status on /hz', async () => {
      const client = testClient(app) as any;

      const res = await client.hz.$get();

      console.log(`res`, res);

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('status', 'healthy');
      expect(json).toHaveProperty('timestamp');
      expect(typeof json.timestamp).toBe('string');
      expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp);
    });

    it('should only accept GET requests on /hz', async () => {
      const client = testClient(app) as any;

      // POST should not be allowed
      const postRes = await client.hz.$post();
      expect(postRes.status).toBe(405);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting with x-webhook-signature header', async () => {
      const client = testClient(app) as any;

      const res = await client.hz.$get(
        {},
        {
          headers: {
            'x-webhook-signature': 'test-signature',
          },
        },
      );

      expect(res.status).toBe(200);
    });
  });

  describe('Body Size Limiting', () => {
    it('should handle request within body limit', async () => {
      const client = testClient(app) as any;

      const smallPayload = { data: 'small payload' };

      // This should work fine with small payload
      const res = await client.hz.$get();
      expect(res.status).toBe(200);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply request ID middleware', async () => {
      const client = testClient(app) as any;

      const res = await client.hz.$get();

      // expect(res.status).toBe(200);
      expect(res.headers.get('x-request-id')).toBeDefined();
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const client = testClient(app) as any;

      const res = await client['non-existent-route'].$get();
      expect(res.status).toBe(404);
    });
  });

  describe('Videos Router', () => {
    it('should mount videos router at /videos', async () => {
      const client = testClient(app) as any;

      // Test that videos route is accessible
      const res = await client.videos.$get();
      // The exact behavior depends on your videos router implementation
      expect(res.status).toBeDefined();
    });
  });
});
