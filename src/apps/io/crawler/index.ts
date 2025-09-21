import express, { type Router } from 'express';
import {
  type CrawlHandlerRequest,
  crawlHandlerSchema,
} from 'src/schema/videos/crawl';
import { validateRequest } from 'src/utils/validator';
import { crawlHandler } from './routes/crawl';

const crawlerRouter: Router = express.Router();

crawlerRouter.post(
  '/crawl-handler',
  validateRequest<CrawlHandlerRequest>(crawlHandlerSchema),
  crawlHandler,
);

export { crawlerRouter };
