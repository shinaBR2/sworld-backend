import {
  type ConvertBodySchema,
  transformEvent,
} from 'src/schema/videos/convert';
import { createTask } from 'src/services/hasura/queries/tasks';
import {
  type CreateCloudTasksParams,
  createCloudTasks,
} from 'src/utils/cloudTask';
import { CustomError } from 'src/utils/custom-error';
import { getCurrentLogger } from 'src/utils/logger';
import { AppError, AppResponse } from 'src/utils/schema';
import { uuidNamespaces } from 'src/utils/systemConfig';
import { v5 as uuidv5 } from 'uuid';
import { buildTaskHandler } from './helpers';

const streamToStorage = async (validatedData: ConvertBodySchema) => {
  const logger = getCurrentLogger();
  const { event } = validatedData;
  const { data, metadata } = transformEvent(event);

  const { id: entityId, platform, fileType, skipProcess } = data;

  if (skipProcess) {
    logger.info({ metadata }, 'Skip process');
    return AppResponse(true, 'ok');
  }

  const entityType = 'video';
  const type = 'import_platform';
  const taskId = uuidv5(
    JSON.stringify({
      entityType: 'video',
      entityId,
      type,
    }),
    uuidNamespaces.cloudTask,
  );

  const taskHandler = buildTaskHandler(fileType, platform);

  if (!taskHandler) {
    // TODO: What to do in this case?
    logger.error({ metadata }, 'Invalid source');
    return AppError('Invalid source');
  }

  const taskConfig: CreateCloudTasksParams = {
    payload: event,
    taskId,
    ...taskHandler,
  };

  try {
    // Create db record first
    await createTask({
      task_id: taskId,
      type,
      metadata: event || {},
      entity_type: entityType,
      entity_id: entityId,
    });
  } catch (hasuraError) {
    throw CustomError.critical('Failed to create task', {
      originalError: hasuraError,
      shouldRetry: true,
    });
  }

  try {
    const task = await createCloudTasks(taskConfig);
    logger.info({ metadata, task }, 'Video task created successfully');
    return AppResponse(true, 'ok');
  } catch (gcpCloudTaskError) {
    throw CustomError.critical('Failed to create task', {
      originalError: gcpCloudTaskError,
      shouldRetry: true,
    });
  }
};

export { streamToStorage };
