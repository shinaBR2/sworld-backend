import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMarkVideoFailed = vi.fn();
vi.mock('src/services/hasura/mutations/videos/markFailed', () => ({
  markVideoFailed: (...args: unknown[]) => mockMarkVideoFailed(...args),
}));
vi.mock('src/utils/logger', () => ({
  getCurrentLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import type { Context } from 'hono';
import { CustomError } from 'src/utils/custom-error';
import { reportVideoTaskFailure } from './index';

const ctxWith = (videoId?: string) =>
  ({ get: () => ({ body: { data: { id: videoId } } }) }) as unknown as Context;

const terminal = () =>
  new CustomError('Client error: Forbidden', {
    errorCode: 'CLIENT_ERROR',
    shouldRetry: false,
  });

describe('reportVideoTaskFailure', () => {
  beforeEach(() => {
    mockMarkVideoFailed.mockReset();
  });

  it('marks failed on a terminal (non-retryable) CustomError with a videoId', async () => {
    const error = terminal();
    await reportVideoTaskFailure(error, ctxWith('v1'));
    expect(mockMarkVideoFailed).toHaveBeenCalledWith('v1', error);
  });

  it('does NOT mark a retryable CustomError', async () => {
    const error = new CustomError('Server error', {
      errorCode: 'SERVER_ERROR',
      shouldRetry: true,
    });
    await reportVideoTaskFailure(error, ctxWith('v1'));
    expect(mockMarkVideoFailed).not.toHaveBeenCalled();
  });

  it('does NOT mark a plain (non-CustomError) Error', async () => {
    await reportVideoTaskFailure(new Error('boom'), ctxWith('v1'));
    expect(mockMarkVideoFailed).not.toHaveBeenCalled();
  });

  it('does NOT mark when there is no videoId', async () => {
    await reportVideoTaskFailure(terminal(), ctxWith(undefined));
    expect(mockMarkVideoFailed).not.toHaveBeenCalled();
  });

  it('never throws even if markVideoFailed fails', async () => {
    mockMarkVideoFailed.mockRejectedValueOnce(new Error('hasura down'));
    await expect(
      reportVideoTaskFailure(terminal(), ctxWith('v1')),
    ).resolves.toBeUndefined();
  });
});
