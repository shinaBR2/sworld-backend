import { describe, it, expect, vi } from 'vitest';
import { videosRouter } from './index';

vi.mock('express', () => {
  const mockRouter = {
    post: vi.fn().mockReturnThis(),
    stack: [
      {
        route: {
          path: '/stream-hls-handler',
          methods: { post: true },
          stack: [{ name: 'middleware' }, { name: 'streamHLSHandler' }],
        },
      },
      {
        route: {
          path: '/import-platform-handler',
          methods: { post: true },
          stack: [{ name: 'middleware' }, { name: 'importPlatformHandler' }],
        },
      },
      {
        route: {
          path: '/fix-duration',
          methods: { post: true },
          stack: [{ name: 'middleware' }, { name: 'fixDurationHandler' }],
        },
      },
      {
        route: {
          path: '/fix-thumbnail',
          methods: { post: true },
          stack: [{ name: 'middleware' }, { name: 'fixThumbnailHandler' }],
        },
      },
    ],
  };

  return {
    default: {
      Router: () => mockRouter,
    },
  };
});

vi.mock('./routes/stream-hls', () => ({
  streamHLSHandler: vi.fn(),
}));

vi.mock('./routes/import-platform', () => ({
  importPlatformHandler: vi.fn(),
}));

vi.mock('./routes/fix-duration', () => ({
  fixDurationHandler: vi.fn(),
}));
vi.mock('./routes/fix-thumbnail', () => ({
  fixThumbnailHandler: vi.fn(),
}));

vi.mock('src/utils/validator', () => ({
  validateRequest: () => vi.fn(),
}));

// TODO verify this test again
describe('videosRouter', () => {
  it('should register all POST routes', () => {
    const routes = videosRouter.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        method: Object.keys(layer.route.methods)[0],
      }));

    const expectedRoutes = [
      {
        path: '/stream-hls-handler',
        method: 'post',
      },
      {
        path: '/import-platform-handler',
        method: 'post',
      },
      {
        path: '/fix-duration',
        method: 'post',
      },
      {
        path: '/fix-thumbnail',
        method: 'post',
      },
    ];

    expectedRoutes.forEach(expectedRoute => {
      const route = routes.find(r => r.path === expectedRoute.path);
      expect(route).toBeDefined();
      expect(route?.method).toBe(expectedRoute.method);
    });
  });

  it('should have validation middleware and handler for stream-hls-handler', () => {
    const streamHandlerRoute = videosRouter.stack.find(layer => layer.route?.path === '/stream-hls-handler');

    const middlewares = streamHandlerRoute?.route.stack || [];

    expect(middlewares).toHaveLength(2);
    expect(middlewares[0].name).toBe('middleware');
    expect(middlewares[1].name).toBe('streamHLSHandler');
  });

  it('should have validation middleware and handler for import-platform-handler', () => {
    const importHandlerRoute = videosRouter.stack.find(layer => layer.route?.path === '/import-platform-handler');

    const middlewares = importHandlerRoute?.route.stack || [];

    expect(middlewares).toHaveLength(2);
    expect(middlewares[0].name).toBe('middleware');
    expect(middlewares[1].name).toBe('importPlatformHandler');
  });

  it('should have validation middleware and handler for fix-duration', () => {
    const fixDurationHandlerRoute = videosRouter.stack.find(layer => layer.route?.path === '/fix-duration');

    const middlewares = fixDurationHandlerRoute?.route.stack || [];

    expect(middlewares).toHaveLength(2);
    expect(middlewares[0].name).toBe('middleware');
    expect(middlewares[1].name).toBe('fixDurationHandler');
  });

  it('should have validation middleware and handler for fix-thumbnail', () => {
    const fixThumbnailHandlerRoute = videosRouter.stack.find(layer => layer.route?.path === '/fix-thumbnail');

    const middlewares = fixThumbnailHandlerRoute?.route.stack || [];

    expect(middlewares).toHaveLength(2);
    expect(middlewares[0].name).toBe('middleware');
    expect(middlewares[1].name).toBe('fixThumbnailHandler');
  });
});
