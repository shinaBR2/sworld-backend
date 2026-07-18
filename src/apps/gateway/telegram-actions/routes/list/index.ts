import type {
  ListTelegramChannelVideosOutput,
  ListTelegramChannelVideosRequest,
  TelegramVideoMessage,
} from 'src/schema/telegram/list';
import { getTelegramClient } from 'src/services/telegram/client';
import { getCurrentLogger } from 'src/utils/logger';
import type { HandlerContext } from 'src/utils/requestHandler';
import { AppError, AppResponse } from 'src/utils/schema';
import { Api, type TelegramClient } from 'teleproto';

const PAGE_SIZE = 20;
// Index into a document's `thumbs` array — 0 is Telegram's smallest embedded
// preview, a few KB, cheap enough to fetch fresh on every list call.
const THUMB_INDEX = 0;

const buildVideoMessage = async (
  client: TelegramClient,
  message: Api.Message,
): Promise<TelegramVideoMessage | null> => {
  const video = message.video;
  if (!video) {
    return null;
  }

  const filenameAttr = video.attributes.find(
    (attr): attr is Api.DocumentAttributeFilename =>
      attr instanceof Api.DocumentAttributeFilename,
  );
  const videoAttr = video.attributes.find(
    (attr): attr is Api.DocumentAttributeVideo =>
      attr instanceof Api.DocumentAttributeVideo,
  );

  let thumbnailDataUri: string | undefined;
  if (video.thumbs?.length) {
    try {
      const thumb = await client.downloadMedia(message, {
        thumb: THUMB_INDEX,
      });
      if (Buffer.isBuffer(thumb)) {
        thumbnailDataUri = `data:image/jpeg;base64,${thumb.toString('base64')}`;
      }
    } catch (error) {
      getCurrentLogger().warn(
        { error, messageId: message.id },
        '[listTelegramChannelVideos] failed to fetch thumbnail',
      );
    }
  }

  return {
    id: String(message.id),
    filename: filenameAttr?.fileName,
    caption: message.message || undefined,
    date: new Date(message.date * 1000).toISOString(),
    sizeBytes: video.size ? Number(video.size) : undefined,
    durationSeconds: videoAttr?.duration,
    thumbnailDataUri,
  };
};

const listTelegramChannelVideos = async (
  context: HandlerContext<ListTelegramChannelVideosRequest>,
) => {
  const logger = getCurrentLogger();
  const { channelId, cursor } = context.validatedData;

  try {
    const client = getTelegramClient();
    await client.connect();

    // Resolves channelId the same way Telegram's own client libraries do —
    // handles a numeric (possibly negative/"marked") peer id or a username
    // string identically, so callers never need to know which form they hold.
    const entity = await client.getInputEntity(channelId);

    const messages = await client.getMessages(entity, {
      limit: PAGE_SIZE,
      offsetId: cursor ? Number(cursor) : undefined,
      filter: new Api.InputMessagesFilterVideo(),
    });

    const videos = (
      await Promise.all(
        messages.map((message) => buildVideoMessage(client, message)),
      )
    ).filter((video): video is TelegramVideoMessage => video !== null);

    const nextCursor =
      messages.length === PAGE_SIZE
        ? String(messages[messages.length - 1].id)
        : undefined;

    return AppResponse<ListTelegramChannelVideosOutput>(true, 'ok', {
      videos,
      nextCursor,
    });
  } catch (error) {
    logger.error(
      { error, channelId },
      '[listTelegramChannelVideos] failed to fetch channel videos',
    );
    return AppError('Failed to fetch channel videos');
  }
};

export { listTelegramChannelVideos };
