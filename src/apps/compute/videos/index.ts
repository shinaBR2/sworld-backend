import express, { type Router } from 'express';
import { type ConvertHandlerRequest, convertHandlerSchema } from 'src/schema/videos/convert';
import { validateRequest } from 'src/utils/validator';
import { convertHandler } from './routes/convert';

const videosRouter: Router = express.Router();

videosRouter.post(
  '/convert-handler',
  validateRequest<ConvertHandlerRequest>(convertHandlerSchema),
  convertHandler,
);

export { videosRouter };
