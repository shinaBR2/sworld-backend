import { Response } from 'express';
// import { ConvertRequest } from 'src/services/videos/convert/schema';
import { verifySignature } from 'src/services/videos/convert/validator';
import { createCloudTasks } from 'src/utils/cloud-task';
import { envConfig } from 'src/utils/envConfig';
import { logger } from 'src/utils/logger';
import { AppError, AppResponse } from 'src/utils/schema';
import { queues } from 'src/utils/systemConfig';

const VIDEO_HANDLERS = {
  HLS: '/videos/stream-hls-handler',
  CONVERT: '/videos/convert-handler',
  PLATFORM_IMPORT: '/videos/platform-import-handler',
} as const;

interface TaskConfig {
  url: string;
  queue: string;
  payload: any; // TODO
}

const createVideoTask = async (config: TaskConfig) => {
  try {
    return await createCloudTasks(config);
  } catch (error) {
    throw error;
  }
};

const buildHandlerUrl = (baseUrl: string, handler: string): string => {
  return `${baseUrl}${handler}`;
};

const streamToStorage = async (req: any, res: Response) => {
  const { computeServiceUrl, ioServiceUrl } = envConfig;
  const { validatedData } = req;
  const { signatureHeader, event } = validatedData;
  const { data, metadata } = event;

  if (!verifySignature(signatureHeader)) {
    throw AppError('Invalid webhook signature for event', {
      eventId: metadata.id,
    });
  }

  // TODO remove this for simplicity
  if (!computeServiceUrl || !ioServiceUrl) {
    throw AppError('Missing environment variable', {
      eventId: metadata.id,
    });
  }

  const { platform, fileType } = data;
  const { streamVideoQueue, convertVideoQueue } = queues;

  const taskConfig: TaskConfig = {
    queue: streamVideoQueue,
    payload: event,
    url: '',
  };

  try {
    switch (fileType) {
      case 'hls':
        taskConfig.url = buildHandlerUrl(ioServiceUrl, VIDEO_HANDLERS.HLS);
        break;
      case 'video':
        taskConfig.url = buildHandlerUrl(
          computeServiceUrl,
          VIDEO_HANDLERS.CONVERT
        );
        taskConfig.queue = convertVideoQueue;
        break;
      default:
        if (platform) {
          taskConfig.url = buildHandlerUrl(
            ioServiceUrl,
            VIDEO_HANDLERS.PLATFORM_IMPORT
          );
        } else {
          logger.error({ metadata }, 'Invalid source');
          return res.json(AppError('Invalid source'));
        }
    }

    const task = await createVideoTask(taskConfig);
    return res.json(AppResponse(true, 'ok', task));
  } catch (error) {
    throw AppError('Failed to create task', {
      eventId: metadata.id,
      error,
    });
  }
};

export { streamToStorage };
