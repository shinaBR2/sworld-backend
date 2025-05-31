import express, { Router } from 'express';
import { validateRequest } from 'src/utils/validator';
import { fixDurationHandler } from './routes/fix-duration';
import { FixDurationHandlerRequest, FixDurationHandlerSchema } from './routes/fix-duration/schema';
import { fixThumbnailHandler } from './routes/fix-thumbnail';
import { FixThumbnailHandlerRequest, FixThumbnailHandlerSchema } from './routes/fix-thumbnail/schema';
import { importPlatformHandler } from './routes/import-platform';
import { streamHLSHandler } from './routes/stream-hls';
import { StreamHandlerRequest, streamHandlerSchema } from 'src/schema/videos/stream-hls';
import { ImportHandlerRequest, importHandlerSchema } from 'src/schema/videos/import-platform';

const videosRouter: Router = express.Router();

videosRouter.post('/stream-hls-handler', validateRequest<StreamHandlerRequest>(streamHandlerSchema), streamHLSHandler);
videosRouter.post(
  '/import-platform-handler',
  validateRequest<ImportHandlerRequest>(importHandlerSchema),
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
