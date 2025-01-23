import express, { Router } from 'express';
import { initializeApp } from 'firebase-admin/app';
import { envConfig } from 'src/utils/envConfig';
import { testUsers } from './test-users';
import { AppError, AppResponse } from 'src/utils/schema';
import { validateRequest } from 'src/utils/validator';
import { ConvertRequest, convert } from './convert';
import { logger } from 'src/utils/logger';
import { ConvertSchema } from './convert/schema';
import { processM3U8 } from './helpers/m3u8';

initializeApp({
  storageBucket: envConfig.storageBucket,
});

const videosRouter: Router = express.Router();

videosRouter.get('/test-users', async (req, res) => {
  try {
    const users = await testUsers();

    res.json(AppResponse(true, 'ok', users));
  } catch (error) {
    res.json(AppError('Error fetching users', error));
  }
});

videosRouter.post(
  '/convert',
  validateRequest<ConvertRequest>(ConvertSchema),
  async (req: any, res) => {
    try {
      const video = await convert(req);

      res.json(AppResponse(true, 'ok', video));
    } catch (error) {
      logger.info(error, `[/videos/convert] some thing wrong`);
      res.json(AppError('Error fetching users', error));
    }
  }
);

videosRouter.post('/upload-m3u8', async (req, res) => {
  const { id, m3u8Url, excludePattern = /\/adjump\// } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing id in request body' });
  }

  if (!m3u8Url) {
    return res.status(400).json({ error: 'Missing m3u8Url in request body' });
  }

  try {
    const result = await processM3U8(m3u8Url, `videos/${id}`, {
      excludePattern,
      maxSegmentSize: 400 * 1024 * 1024, // 400MB limit
    });

    res.json(result);
  } catch (error) {
    // logger.error('Failed to process M3U8:', {
    //   error: error instanceof Error ? error.message : String(error),
    //   stack: error instanceof Error ? error.stack : undefined,
    //   m3u8Url,
    // });
    console.error('Error processing M3U8:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: (error as unknown as Error).message,
    });
  }
});

export { videosRouter };
