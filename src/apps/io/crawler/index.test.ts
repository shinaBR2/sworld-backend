import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock Hono
vi.mock('hono', () => {
  const mockHono = vi.fn(() => ({
    post: vi.fn(),
  }));
  return { Hono: mockHono };
});

// Mock dependencies
vi.mock('./routes/crawl', () => ({
  crawlHandler: 'mockCrawlHandler',
}));

vi.mock('src/schema/videos/crawl', () => ({
  crawlHandlerSchema: 'mockSchema',
}));

vi.mock('src/utils/validators/request', () => ({
  honoValidateRequest: vi.fn().mockReturnValue('mockMiddleware'),
}));

vi.mock('src/utils/requestHandler', () => ({
  honoRequestHandler: vi.fn().mockReturnValue('mockHandler'),
}));

describe('crawlerRouter', () => {
  let mockApp: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = { post: vi.fn() };
    vi.mocked(Hono).mockReturnValue(mockApp as unknown as Hono);
  });

  it('should set up router correctly', async () => {
    // Import the module under test
    const { crawlerRouter } = await import('./index');
    const { honoValidateRequest } = await import(
      'src/utils/validators/request'
    );
    const { honoRequestHandler } = await import('src/utils/requestHandler');
    const { crawlHandler } = await import('./routes/crawl');

    // Verify Hono router was created
    expect(Hono).toHaveBeenCalled();

    // Verify the route was set up correctly
    expect(mockApp.post).toHaveBeenCalledWith(
      '/crawl-handler',
      'mockMiddleware',
      'mockHandler',
    );

    // Verify middleware and handler were properly wrapped
    expect(honoValidateRequest).toHaveBeenCalledWith('mockSchema');
    expect(honoRequestHandler).toHaveBeenCalledWith('mockCrawlHandler');
  });
});
