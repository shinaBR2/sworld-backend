import { createBaseApp } from 'src/utils/base-app';
import { errorHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { videosRouter } from './videos';

const app = createBaseApp();

app.use('/videos', videosRouter);
app.use(errorHandler(logger));

export { app };
