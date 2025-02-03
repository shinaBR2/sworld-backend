/**
 * TODO this is only used for legacy monolith architecture
 * Should be removed as soon as microservices ready
 */
import express, { Router } from 'express';
import { initializeApp } from 'firebase-admin/app';
import { envConfig } from 'src/utils/envConfig';
import { AppError, AppResponse } from 'src/utils/schema';
import { validateRequest } from 'src/utils/validator';
import { convert } from './convert';
import { logger } from 'src/utils/logger';
import { ConvertRequest, ConvertSchema } from './convert/schema';

// TODO migrate this to gcloud client SDK
initializeApp({
  storageBucket: envConfig.storageBucket,
});

const videosRouter: Router = express.Router();

videosRouter.post('/convert', validateRequest<ConvertRequest>(ConvertSchema), async (req: any, res) => {
  try {
    const video = await convert(req);

    res.json(AppResponse(true, 'ok', video));
  } catch (error) {
    logger.info(error, `[/videos/convert] some thing wrong`);
    res.json(AppError('Error fetching users', error));
  }
});

export { videosRouter };
