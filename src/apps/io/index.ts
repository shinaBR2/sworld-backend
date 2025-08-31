import { createBaseApp } from 'src/utils/base-app';
import { errorHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { crawlerRouter } from './crawler';
import { videosRouter } from './videos';

const app = createBaseApp();

app.use('/videos', videosRouter);
app.use('/crawlers', crawlerRouter);
app.use(errorHandler(logger));

export { app };
