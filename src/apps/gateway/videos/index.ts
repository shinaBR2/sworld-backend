import { Hono, type ValidationTargets } from 'hono';
import {
  type HasuraWebhookRequest,
  hasuraWebhookSchema,
} from 'src/schema/hasura';
import { type ConvertRequest, convertSchema } from 'src/schema/videos/convert';
import { type CrawlRequest, crawlSchema } from 'src/schema/videos/crawl';
import { type ShareRequest, shareSchema } from 'src/schema/videos/share';
import {
  type SubtitleCreatedRequest,
  subtitleCreatedSchema,
} from 'src/schema/videos/subtitle-created';
import { getCurrentLogger } from 'src/utils/logger';
import { requestHandler } from 'src/utils/requestHandler';
import { honoValidateRequest } from 'src/utils/validators/request';
import { zodValidator } from 'src/utils/validators/zodValidator';
import { type ZodError, type ZodSchema, z } from 'zod';
import { crawlHandler } from './routes/crawl';
import { fixVideosDuration } from './routes/fix-videos-duration';
import { fixVideosThumbnail } from './routes/fix-videos-thumbnail';
import { sharePlaylistHandler } from './routes/share-playlist';
import { shareVideoHandler } from './routes/share-video';
import { streamToStorage } from './routes/stream-to-storage';
import { subtitleCreatedHandler } from './routes/subtitle-created';

const videosRouter = new Hono();

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
});

videosRouter.post('/test', zodValidator('json', testSchema), (c) => {
  const logger = getCurrentLogger();
  const data = c.req.valid('json');

  logger.info({
    message: '[videosRouter] Validation result',
    data,
  });

  return c.json({ message: 'ok' });
});

videosRouter.post(
  '/convert',
  zodValidator('json', convertSchema),
  async (c) => {
    const data = c.req.valid('json');

    const result = await streamToStorage(data);

    return c.json(result);
  },
);

// TODO
// videosRouter.post(
//   '/fix-videos-duration',
//   honoValidateRequest<HasuraWebhookRequest>(hasuraWebhookSchema),
//   fixVideosDuration,
// );
// videosRouter.post(
//   '/fix-videos-thumbnail',
//   honoValidateRequest<HasuraWebhookRequest>(hasuraWebhookSchema),
//   fixVideosThumbnail,
// );
// videosRouter.post(
//   '/crawl',
//   honoValidateRequest<CrawlRequest>(crawlSchema),
//   crawlHandler,
// );
// videosRouter.post(
//   '/share-playlist',
//   honoValidateRequest<ShareRequest>(shareSchema),
//   sharePlaylistHandler,
// );
// videosRouter.post(
//   '/share-video',
//   honoValidateRequest<ShareRequest>(shareSchema),
//   shareVideoHandler,
// );
// videosRouter.post(
//   '/subtitle-created',
//   honoValidateRequest<SubtitleCreatedRequest>(subtitleCreatedSchema),
//   requestHandler(async (context) => {
//     const { validatedData } = context;
//     const result = await subtitleCreatedHandler(validatedData);

//     return {
//       success: true,
//       message: 'ok',
//       dataObject: result,
//     };
//   }),
// );

// videosRouter.post(
//   '/test',
//   newValidateRequest(shareSchema),
//   requestHandler(async context => {
//     const { validatedData } = context;

//     console.log(`validatedData`, validatedData);
//     return {
//       success: true,
//       message: 'ok',
//       dataObject: validatedData,
//     };
//   })
// );

export { videosRouter };
