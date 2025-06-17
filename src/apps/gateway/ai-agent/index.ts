import express, { Router } from 'express';
// import { validateRequest } from 'src/utils/validator';
import { handler } from './routes/video-recommendations';

const aiAgentRouter: Router = express.Router();

aiAgentRouter.post('/video-recommendations', handler);

export { aiAgentRouter };
