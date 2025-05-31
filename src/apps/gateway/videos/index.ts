import express, { Router } from 'express';
import { validateRequest } from 'src/utils/validator';
import { crawlHandler } from './routes/crawl';
import { CrawlRequest, CrawlSchema } from './routes/crawl/schema';
import { fixVideosDuration } from './routes/fix-videos-duration';
import { fixVideosThumbnail } from './routes/fix-videos-thumbnail';
import { streamToStorage } from './routes/stream-to-storage';
import { HasuraWebhookRequest, hasuraWebhookSchema } from 'src/schema/hasura';
import { ConvertRequest, convertSchema } from 'src/schema/videos/convert';

const videosRouter: Router = express.Router();

videosRouter.post('/convert', validateRequest<ConvertRequest>(convertSchema), streamToStorage);
videosRouter.post(
  '/fix-videos-duration',
  validateRequest<HasuraWebhookRequest>(hasuraWebhookSchema),
  fixVideosDuration
);
videosRouter.post(
  '/fix-videos-thumbnail',
  validateRequest<HasuraWebhookRequest>(hasuraWebhookSchema),
  fixVideosThumbnail
);
videosRouter.post('/crawl', validateRequest<CrawlRequest>(CrawlSchema), crawlHandler);

export { videosRouter };
