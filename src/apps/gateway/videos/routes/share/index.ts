import { Request, Response } from 'express';
import { envConfig } from 'src/utils/envConfig';
import { queues } from 'src/utils/systemConfig';
import { logger } from 'src/utils/logger';
import { AppError, AppResponse } from 'src/utils/schema';
import { ValidatedRequest } from 'src/utils/validator';
import { verifySignature } from 'src/services/videos/convert/validator';
import { CreateCloudTasksParams, createCloudTasks } from 'src/utils/cloud-task';
import { TaskEntityType, TaskType } from 'src/database/models/task';

const shareVideoHandler = async (req: Request, res: Response) => {
  const { computeServiceUrl, ioServiceUrl } = envConfig;
  // const { validatedData } = req as ValidatedRequest<ConvertRequest>;
  const { validatedData } = req as ValidatedRequest<any>;
  const { signatureHeader, event } = validatedData;
  const { data, metadata } = event;

  if (!verifySignature(signatureHeader)) {
    return res.json(
      AppError('Invalid webhook signature for event', {
        eventId: metadata.id,
      })
    );
  }

  // TODO remove this for simplicity
  if (!computeServiceUrl || !ioServiceUrl) {
    return res.json(
      AppError('Missing environment variable', {
        eventId: metadata.id,
      })
    );
  }

  const { id: entityId, platform, fileType, skipProcess } = data;
  const { streamVideoQueue, convertVideoQueue } = queues;

  if (skipProcess) {
    logger.info({ metadata }, 'Skip process');
    return res.json(AppResponse(true, 'skipped'));
  }

  const taskConfig: CreateCloudTasksParams = {
    audience: ioServiceUrl,
    queue: streamVideoQueue,
    payload: event,
    url: `${ioServiceUrl}/videos/share-handler`,
    entityId,
    entityType: TaskEntityType.VIDEO,
    type: TaskType.SHARE,
  };

  try {
    const task = await createCloudTasks(taskConfig);
    logger.info({ metadata, task }, 'Video task created successfully');
    return res.json(AppResponse(true, 'ok'));
  } catch (error) {
    return res.json(
      AppError('Failed to create task', {
        eventId: metadata.id,
        error,
      })
    );
  }
};

export { shareVideoHandler };
