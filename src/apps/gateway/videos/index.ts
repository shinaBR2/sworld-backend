import express, { Router } from 'express';
import { validateRequest } from 'src/utils/validator';
import { ConvertRequest, ConvertSchema } from '../../../services/videos/convert/schema';
import { crawlHandler } from './routes/crawl';
import { CrawlRequest, CrawlSchema } from './routes/crawl/schema';
import { fixVideosDuration } from './routes/fix-videos-duration';
import { fixVideosThumbnail } from './routes/fix-videos-thumbnail';
import { streamToStorage } from './routes/stream-to-storage';
import { HasuraWebhookRequest, hasuraWebhookSchema } from 'src/schema/hasura';

const videosRouter: Router = express.Router();

// TODO: refactor the ConvertSchema from the old legacy code
videosRouter.post('/convert', validateRequest<ConvertRequest>(ConvertSchema), streamToStorage);
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
