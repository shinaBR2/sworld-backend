import type { Request, Response } from 'express';
import { convertVideo } from 'src/services/videos/convert/handler';
import { CustomError } from 'src/utils/custom-error';
import { VIDEO_ERRORS } from 'src/utils/error-codes';
import { logger } from 'src/utils/logger';

const convertHandler = async (req: Request, res: Response): Promise<Response | undefined> => {
  const taskId = req.headers['x-task-id'] as string;
  const { data, metadata } = req.body;
  const { id } = data;

  let playableVideoUrl: string | undefined;
  try {
    logger.info(
      metadata,
      `[/videos/convert-handler] start processing event "${metadata.id}", video "${id}"`,
    );
    playableVideoUrl = await convertVideo({
      taskId,
      videoData: data,
    });

    return res.json({ playableVideoUrl });
  } catch (error: unknown) {
    const customError = CustomError.critical('Video conversion failed', {
      originalError: error instanceof Error ? error : new Error(String(error)),
      errorCode: VIDEO_ERRORS.CONVERSION_FAILED,
      context: {
        data,
        metadata,
        taskId,
      },
      source: 'apps/compute/videos/routes/convert/index.ts',
    });

    // Ensure we're not sending a response if headers are already sent
    if (!res.headersSent) {
      return res.status(500).json({ error: customError.message });
    }

    // If headers are already sent, we can't send a response, so just log the error
    logger.error(customError);
  }
};

export { convertHandler };
