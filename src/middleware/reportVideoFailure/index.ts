import type { Context } from 'hono';
import { markVideoFailed } from 'src/services/hasura/mutations/videos/markFailed';
import { CustomError } from 'src/utils/custom-error';
import { getCurrentLogger } from 'src/utils/logger';

/**
 * Call from a video-processing app's `onError` (compute / io). When a TERMINAL
 * failure happens for a known video, flag the video `failed` (which fires the
 * Slack alert via B2).
 *
 * "Terminal" = a non-retryable `CustomError` (Option A) — e.g. a 403 hotlink
 * block. Transient/retryable errors are left alone so Cloud Tasks can retry and
 * we don't alert on blips that self-heal.
 *
 * Never throws: a failed mark-failed must not take over the error response.
 */
const reportVideoTaskFailure = async (
  error: unknown,
  context: Context,
): Promise<void> => {
  const logger = getCurrentLogger();

  try {
    const isTerminal = error instanceof CustomError && !error.shouldRetry;
    if (!isTerminal) return;

    const videoId: string | undefined =
      context.get('validatedData')?.body?.data?.id;
    if (!videoId) return;

    await markVideoFailed(videoId, error);
    logger.info({ videoId }, 'Marked video as failed');
  } catch (markError) {
    logger.error(markError, 'Failed to mark video as failed');
  }
};

export { reportVideoTaskFailure };
