import { Request, Response } from 'express';
import { AppError, AppResponse } from 'src/utils/schema';
import { ValidatedRequest, isValidEmail } from 'src/utils/validator';
import { verifySignature } from 'src/services/videos/convert/validator';
import { ShareRequest } from 'src/schema/videos/share';
import { getPlaylistVideos } from 'src/services/hasura/queries/share';
import { insertSharedVideoRecipients } from 'src/services/hasura/mutations/share-videos';
import { CustomError } from 'src/utils/custom-error';
import { VIDEO_ERRORS } from 'src/utils/error-codes';

const shareVideoHandler = async (req: Request, res: Response) => {
  const { validatedData } = req as ValidatedRequest<ShareRequest>;
  const { signatureHeader, event } = validatedData;
  const { data, metadata } = event;

  if (!verifySignature(signatureHeader)) {
    return res.json(
      AppError('Invalid webhook signature for event', {
        eventId: metadata.id,
      })
    );
  }

  const { id: entityId, sharedRecipientsInput } = data;

  // if (skipProcess) {
  //   logger.info({ metadata }, 'Skip process');
  //   return res.json(AppResponse(true, 'skipped'));
  // }

  // 1. Validate emails
  const validEmails = sharedRecipientsInput.filter(email => isValidEmail(email));
  if (!validEmails.length) {
    // TODO send email
    return res.json(
      AppError('Invalid email', {
        eventId: metadata.id,
      })
    );
  }
  // 2. get list videos and users
  const { playlist_by_pk, users } = await getPlaylistVideos(entityId, validEmails);

  if (!playlist_by_pk) {
    return res.json(
      AppError('Playlist not found', {
        eventId: metadata.id,
      })
    );
  }

  const videos = playlist_by_pk.playlist_videos.map(pv => pv.video);

  if (!videos.length) {
    return res.json(
      AppError('No ready videos found in playlist', {
        eventId: metadata.id,
      })
    );
  }

  if (!users?.length) {
    return res.json(
      AppError('No valid users found', {
        eventId: metadata.id,
      })
    );
  }

  // 3. create shared_video_recipients record for each video in playlist
  const insert_records = [];
  for (let i = 0; i < users.length; i++) {
    const records = videos.map(video => {
      return {
        videoId: video.id,
        playlistId: entityId,
        receiverId: users[i].id,
      };
    });
    insert_records.push(...records);
  }

  // 4. Update shared_recipients in playlist
  try {
    await insertSharedVideoRecipients(insert_records, entityId, validEmails);
  } catch (error) {
    throw CustomError.critical('Video conversion failed', {
      originalError: error,
      errorCode: VIDEO_ERRORS.SHARE_FAILED,
      context: {
        data,
        metadata,
      },
      source: 'apps/gateway/videos/routes/share/index.ts',
    });
  }

  return res.json(AppResponse(true, 'ok'));
};

export { shareVideoHandler };
