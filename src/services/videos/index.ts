import express, { Router } from 'express';
import { initializeApp } from 'firebase-admin/app';
import { envConfig } from 'src/utils/envConfig';
import { testUsers } from './test-users';
import { AppError, AppResponse } from 'src/utils/schema';
import { validateRequest } from 'src/utils/validator';
import { ConvertRequest, convert } from './convert';
import { logger } from 'src/utils/logger';
import { ConvertSchema } from './convert/schema';

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

export { videosRouter };
