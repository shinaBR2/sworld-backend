import type { Request, Response } from 'express';
import { TaskEntityType, TaskType } from 'src/database/models/task';
import { getVideoMissingThumbnail } from 'src/database/queries/videos';
import type { HasuraWebhookRequest } from 'src/schema/hasura';
import { verifySignature } from 'src/services/videos/convert/validator';
import { type CreateCloudTasksParams, createCloudTasks } from 'src/utils/cloud-task';
import { envConfig } from 'src/utils/envConfig';
import { AppError, AppResponse } from 'src/utils/schema';
import { queues } from 'src/utils/systemConfig';
import type { ValidatedRequest } from 'src/utils/validator';

const fixVideosThumbnail = async (req: Request, res: Response) => {
  const { ioServiceUrl } = envConfig;
  const { validatedData } = req as ValidatedRequest<HasuraWebhookRequest>;
  const { signatureHeader } = validatedData;

  if (!verifySignature(signatureHeader)) {
    return res.json(AppError('Invalid webhook signature for event'));
  }

  if (!ioServiceUrl) {
    return res.json(AppError('Missing environment variable'));
  }

  const { streamVideoQueue } = queues;

  try {
    const videos = await getVideoMissingThumbnail();
    await Promise.all(
      videos.map(async (video) => {
        const taskConfig: CreateCloudTasksParams = {
          audience: ioServiceUrl,
          queue: streamVideoQueue,
          payload: {
            id: video.id,
          },
          url: `${ioServiceUrl}/videos/fix-thumbnail`,
          entityId: video.id,
          entityType: TaskEntityType.VIDEO,
          type: TaskType.FIX_THUMBNAIL,
        };

        await createCloudTasks(taskConfig);
      }),
    );

    return res.json(AppResponse(true, 'ok'));
  } catch (_error) {
    return res.json(AppError('Failed to create task'));
  }
};

export { fixVideosThumbnail };
