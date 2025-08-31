import express, { type Router } from 'express';
import { type HashnodeWebhookRequest, hashnodeWebhookSchema } from 'src/schema/hashnode';
import { validateRequest } from 'src/utils/validator';
import { postEventsHandler } from './routes/posts';

const hashnodeRouter: Router = express.Router();

hashnodeRouter.post(
  '/posts-webhook',
  validateRequest<HashnodeWebhookRequest>(hashnodeWebhookSchema),
  postEventsHandler,
);

export { hashnodeRouter };
