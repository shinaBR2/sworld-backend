import type { Context } from 'hono';
import { CustomError } from 'src/utils/custom-error';
import { getCurrentLogger } from 'src/utils/logger';

/**
 * Call from the central request-handler wrapper (`honoRequestHandler`). When a
 * TERMINAL failure happens for a video-processing task, flag the video `failed`
 * (which fires the Slack alert via B2).
 *
 * A "video-processing task" is identified purely by its Cloud-Task payload
 * shape: `validatedData.body.data.id` is the video id. Crawler tasks carry no
 * `id`, and gateway (Hasura action/event) routes use `validatedData.event` —
 * so non-video flows fall straight through the guard below, untouched.
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

    // Imported lazily so merely loading `honoRequestHandler` (used by every
    // route, incl. non-Hasura gateway ones) doesn't eagerly construct the
    // Hasura client, which throws at import when its env vars are absent.
    const { markVideoFailed } = await import(
      'src/services/hasura/mutations/videos/markFailed'
    );
    await markVideoFailed(videoId, error);
    logger.info({ videoId }, 'Marked video as failed');
  } catch (markError) {
    logger.error(markError, 'Failed to mark video as failed');
  }
};

export { reportVideoTaskFailure };
