import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithError } from './index';
import { CustomError } from '../custom-error';
import { HTTP_ERRORS } from '../error-codes';

// Mock Response class
class MockResponse {
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;

  constructor(body: string, init: ResponseInit) {
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? '';
    this.ok = this.status >= 200 && this.status < 300;
  }
}

describe('fetchWithError', () => {
  const mockUrl = 'https://api.example.com/data';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should return response when fetch is successful', async () => {
    const mockResponse = new MockResponse('ok', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

    const response = await fetchWithError(mockUrl);
    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(mockUrl, undefined);
  });

  it('should pass through options to fetch', async () => {
    const mockResponse = new MockResponse('ok', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    await fetchWithError(mockUrl, options);
    expect(global.fetch).toHaveBeenCalledWith(mockUrl, options);
  });

  it('should throw retryable error for network failures', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await fetchWithError(mockUrl);
    } catch (error) {
      expect(error instanceof CustomError).toBe(true);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.NETWORK_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });

  it('should throw retryable error for 5xx responses', async () => {
    const mockResponse = new MockResponse('server error', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

    try {
      await fetchWithError(mockUrl);
    } catch (error) {
      expect(error instanceof CustomError).toBe(true);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.SERVER_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });

  it('should throw non-retryable error for 4xx responses', async () => {
    const mockResponse = new MockResponse('not found', {
      status: 404,
      statusText: 'Not Found',
    });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

    try {
      await fetchWithError(mockUrl);
    } catch (error) {
      expect(error instanceof CustomError).toBe(true);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.CLIENT_ERROR);
      expect((error as CustomError).shouldRetry).toBe(false);
    }
  });

  it('should preserve CustomError if thrown from fetch', async () => {
    const customError = new CustomError('Custom error message', {
      errorCode: HTTP_ERRORS.SERVER_ERROR,
      shouldRetry: true,
    });
    vi.mocked(global.fetch).mockRejectedValue(customError);

    try {
      await fetchWithError(mockUrl);
    } catch (error) {
      expect(error).toBe(customError); // Should be the exact same error instance
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.SERVER_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });
});
