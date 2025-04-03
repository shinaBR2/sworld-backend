import { checkBatchStatus, uploadRemoteMp4ToHLS } from 'src/services/videos/helpers/cloudinary';
import { createBaseApp } from '../../utils/base-app';
import { errorHandler } from '../../utils/error-handler';
import { logger } from '../../utils/logger';
import { hashnodeRouter } from './hashnode';
import { videosRouter } from './videos';

const app = createBaseApp();

// Set the application to trust the reverse proxy
app.set('trust proxy', 1);

// Routes
// app.use("/health-check", healthCheckRouter);
app.use('/videos', videosRouter);
app.use('/hashnode', hashnodeRouter);
app.use('/cloudinary-upload', async (req, res) => {
  await uploadRemoteMp4ToHLS('https://storage.googleapis.com/my-world-dev.appspot.com/videos/raw/frieren/ep-05.mp4');
  res.send('Cloudinary upload endpoint');
});
app.use('/cloudinary-webhook', async (req, res) => {
  console.log(req.body);
  res.send('Cloudinary webhook received');
});
app.use('/cloudinary-check-status', async (req, res) => {
  await checkBatchStatus('videos/test-video-frieren');
  res.send('Cloudinary webhook received');
});

// Error handlers
app.use(errorHandler(logger));

export { app };
