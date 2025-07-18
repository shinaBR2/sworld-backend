import express, { Router } from 'express';
import { validateRequest } from 'src/utils/validator';
import { fixDurationHandler } from './routes/fix-duration';
import { fixThumbnailHandler } from './routes/fix-thumbnail';
import { importPlatformHandler } from './routes/import-platform';
import { streamHLSHandler } from './routes/stream-hls';
import { StreamHandlerRequest, streamHandlerSchema } from 'src/schema/videos/stream-hls';
import { ImportHandlerRequest, importHandlerSchema } from 'src/schema/videos/import-platform';
import { FixDurationHandlerRequest, fixDurationHandlerSchema } from 'src/schema/videos/fix-duration';
import { FixThumbnailHandlerRequest, fixThumbnailHandlerSchema } from 'src/schema/videos/fix-thumbnail';

const videosRouter: Router = express.Router();

videosRouter.post('/stream-hls-handler', validateRequest<StreamHandlerRequest>(streamHandlerSchema), streamHLSHandler);
videosRouter.post(
  '/import-platform-handler',
  validateRequest<ImportHandlerRequest>(importHandlerSchema),
  importPlatformHandler
);
videosRouter.post(
  '/fix-duration',
  validateRequest<FixDurationHandlerRequest>(fixDurationHandlerSchema),
  fixDurationHandler
);
videosRouter.post(
  '/fix-thumbnail',
  validateRequest<FixThumbnailHandlerRequest>(fixThumbnailHandlerSchema),
  fixThumbnailHandler
);

export { videosRouter };
