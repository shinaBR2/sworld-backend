import express, { Router } from 'express';
import { AppError } from 'src/utils/schema';
import { logger } from 'src/utils/logger';
import { convertVideo } from 'src/services/videos/convert/handler';

const videosRouter: Router = express.Router();

videosRouter.post('/convert-handler', async (req: any, res) => {
  const { data, metadata } = req.body;

  let video;
  try {
    logger.info(
      metadata,
      `[/videos/convert-handler] start processing event "${metadata.id}", video "${data.id}"`
    );
    video = await convertVideo(data);
    return res.json(video);
  } catch (error) {
    throw AppError('Video conversion failed', {
      videoId: data.id,
      error: (error as Error).message,
    });
  }

  return video;
});

export { videosRouter };
