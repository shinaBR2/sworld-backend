import { Hono } from 'hono';
import { importTelegramArchiveSchema } from 'src/schema/telegram/import';
import { listTelegramChannelVideosSchema } from 'src/schema/telegram/list';
import { honoRequestHandler } from 'src/utils/requestHandler';
import { honoValidateRequest } from 'src/utils/validators/request';
import { importTelegramArchive } from './routes/import';
import { listTelegramChannelVideos } from './routes/list';

/**
 * Telegram MTProto Actions — session-authenticated (`x-hasura-user-id`), not
 * webhook-signature-authenticated, same split as `videos-actions`/`storage`.
 *
 * curl -X POST 'http://localhost:4000/telegram-actions/list' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "action": { "name": "listTelegramChannelVideos" },
 *     "input": { "input": { "channelId": "-582839764" } },
 *     "session_variables": { "x-hasura-user-id": "550e8400-e29b-41d4-a716-446655440001" }
 *   }'
 */
const telegramActionsRouter = new Hono();

telegramActionsRouter.post(
  '/list',
  honoValidateRequest(listTelegramChannelVideosSchema),
  honoRequestHandler(listTelegramChannelVideos),
);

telegramActionsRouter.post(
  '/import',
  honoValidateRequest(importTelegramArchiveSchema),
  honoRequestHandler(importTelegramArchive),
);

export { telegramActionsRouter };
