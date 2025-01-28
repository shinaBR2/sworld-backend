import { Response } from 'express';
// import { ConvertRequest } from 'src/services/videos/convert/schema';
import { verifySignature } from 'src/services/videos/convert/validator';
import { createCloudTasks } from 'src/utils/cloud-task';
import { envConfig } from 'src/utils/envConfig';
import { AppError, AppResponse } from 'src/utils/schema';

const streamToStorage = async (req: any, res: Response) => {
  const { validatedData } = req;
  const { signatureHeader, event } = validatedData;
  const { metadata } = event;

  if (!verifySignature(signatureHeader)) {
    throw AppError('Invalid webhook signature for event', {
      eventId: metadata.id,
    });
  }

  // TODO remove this for simplicity
  if (!envConfig.computeServiceUrl) {
    throw AppError('Missing environment variable: computeServiceUrl', {
      eventId: metadata.id,
    });
  }

  try {
    const task = await createCloudTasks({
      url: `${envConfig.computeServiceUrl}/videos/convert-handler`,
      queue: 'convert-video',
      payload: event,
    });

    return res.json(AppResponse(true, 'ok', task));
  } catch (error) {
    throw AppError('Failed to create conversion task', {
      eventId: metadata.id,
      error,
    });
  }
};

export { streamToStorage };
