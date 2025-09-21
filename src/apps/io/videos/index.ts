import express, { type Router } from 'express';
import { Hono } from 'hono';
import {
  type FixDurationHandlerRequest,
  fixDurationHandlerSchema,
} from 'src/schema/videos/fix-duration';
import {
  type FixThumbnailHandlerRequest,
  fixThumbnailHandlerSchema,
} from 'src/schema/videos/fix-thumbnail';
import {
  type ImportHandlerRequest,
  importHandlerSchema,
} from 'src/schema/videos/import-platform';
import {
  type StreamHandlerRequest,
  streamHandlerSchema,
} from 'src/schema/videos/stream-hls';
import { honoRequestHandler } from 'src/utils/requestHandler';
import { validateRequest } from 'src/utils/validator';
import { honoValidateRequest } from 'src/utils/validators/request';
import { fixDurationHandler } from './routes/fix-duration';
import { fixThumbnailHandler } from './routes/fix-thumbnail';
import { importPlatformHandler } from './routes/import-platform';
import { streamHLSHandler } from './routes/stream-hls';

const videosRouter = new Hono();

videosRouter.post(
  '/stream-hls-handler',
  honoValidateRequest(streamHandlerSchema),
  honoRequestHandler(streamHLSHandler),
);
videosRouter.post(
  '/import-platform-handler',
  honoValidateRequest(importHandlerSchema),
  honoRequestHandler(importPlatformHandler),
);
videosRouter.post(
  '/fix-duration',
  validateRequest<FixDurationHandlerRequest>(fixDurationHandlerSchema),
  fixDurationHandler,
);
videosRouter.post(
  '/fix-thumbnail',
  validateRequest<FixThumbnailHandlerRequest>(fixThumbnailHandlerSchema),
  fixThumbnailHandler,
);

export { videosRouter };
