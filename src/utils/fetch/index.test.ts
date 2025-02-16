import { describe, it, expect, vi, beforeEach } from 'vitest';
import fetch, { Response } from 'node-fetch';
import { fetchWithError } from './index';
import { CustomError } from '../custom-error';
import { HTTP_ERRORS } from '../error-codes';

vi.mock('node-fetch', () => ({
  default: vi.fn(),
  Response: vi.fn().mockImplementation((body, init) => ({
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    ok: init?.status ? init.status >= 200 && init.status < 300 : true,
  })),
}));

describe('fetchWithError', () => {
  const mockUrl = 'https://api.example.com/data';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return response when fetch is successful', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const response = await fetchWithError(mockUrl);
    expect(response).toBe(mockResponse);
    expect(fetch).toHaveBeenCalledWith(mockUrl, undefined);
  });

  it('should pass through fetch options', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };

    await fetchWithError(mockUrl, options);
    expect(fetch).toHaveBeenCalledWith(mockUrl, options);
  });

  it('should throw retryable error for network failures', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.mocked(fetch).mockRejectedValue(networkError);

    await expect(fetchWithError(mockUrl)).rejects.toThrow(CustomError);
    try {
      await fetchWithError(mockUrl);
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.NETWORK_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });

  it('should throw retryable error for 5xx responses', async () => {
    const mockResponse = new Response('server error', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await expect(fetchWithError(mockUrl)).rejects.toThrow(CustomError);
    try {
      await fetchWithError(mockUrl);
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.SERVER_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });

  it('should throw non-retryable error for 4xx responses', async () => {
    const mockResponse = new Response('not found', {
      status: 404,
      statusText: 'Not Found',
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await expect(fetchWithError(mockUrl)).rejects.toThrow(CustomError);
    try {
      await fetchWithError(mockUrl);
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.CLIENT_ERROR);
      expect((error as CustomError).shouldRetry).toBe(false);
    }
  });

  it('should preserve CustomError if thrown from fetch', async () => {
    const customError = new CustomError('Custom error message', {
      errorCode: HTTP_ERRORS.SERVER_ERROR,
      shouldRetry: true,
    });
    vi.mocked(fetch).mockRejectedValue(customError);

    await expect(fetchWithError(mockUrl)).rejects.toThrow(CustomError);
    try {
      await fetchWithError(mockUrl);
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBe(customError); // Should be the exact same error instance
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.SERVER_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });

  it('should handle non-Error objects thrown by fetch', async () => {
    vi.mocked(fetch).mockRejectedValue('string error');

    await expect(fetchWithError(mockUrl)).rejects.toThrow(CustomError);
    try {
      await fetchWithError(mockUrl);
      expect(true).toBeFalsy(); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).errorCode).toBe(HTTP_ERRORS.NETWORK_ERROR);
      expect((error as CustomError).shouldRetry).toBe(true);
    }
  });
});
