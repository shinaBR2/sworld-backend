import express, { Router } from 'express';
import { validateRequest } from 'src/utils/validator';
// import {
//   ConvertHandlerRequest,
//   ConvertHandlerSchema,
// } from './routes/convert/schema';
import {
  StreamHandlerRequest,
  StreamHandlerSchema,
} from './routes/stream-hls/schema';
import { streamHLSHandler } from './routes/stream-hls';

const videosRouter: Router = express.Router();

videosRouter.post(
  '/stream-hls-handler',
  validateRequest<StreamHandlerRequest>(StreamHandlerSchema),
  streamHLSHandler
);
// videosRouter.post(
//   '/import-platform-handler',
//   validateRequest<ConvertHandlerRequest>(ConvertHandlerSchema),
//   importPlatformHandler
// );

export { videosRouter };
