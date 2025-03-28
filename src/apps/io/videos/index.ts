import express, { Router } from 'express';
import { streamHLSHandler } from './routes/stream-hls';
import { importPlatformHandler } from './routes/import-platform';
import { validateRequest } from 'src/utils/validator';
import { StreamHandlerRequest, StreamHandlerSchema } from './routes/stream-hls/schema';
import { ImportHandlerRequest, ImportHandlerSchema } from './routes/import-platform/schema';
import { FixDurationHandlerRequest, FixDurationHandlerSchema } from './routes/fix-duration/schema';
import { fixDurationHandler } from './routes/fix-duration';
import { fixThumbnailHandler } from './routes/fix-thumbnail';
import { FixThumbnailHandlerRequest, FixThumbnailHandlerSchema } from './routes/fix-thumbnail/schema';

const videosRouter: Router = express.Router();

videosRouter.post('/stream-hls-handler', validateRequest<StreamHandlerRequest>(StreamHandlerSchema), streamHLSHandler);
videosRouter.post(
  '/import-platform-handler',
  validateRequest<ImportHandlerRequest>(ImportHandlerSchema),
  importPlatformHandler
);
videosRouter.post(
  '/fix-duration',
  validateRequest<FixDurationHandlerRequest>(FixDurationHandlerSchema),
  fixDurationHandler
);
videosRouter.post(
  '/fix-thumbnail',
  validateRequest<FixThumbnailHandlerRequest>(FixThumbnailHandlerSchema),
  fixThumbnailHandler
);

export { videosRouter };
