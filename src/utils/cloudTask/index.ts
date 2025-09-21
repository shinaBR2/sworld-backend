import type { protos } from '@google-cloud/tasks';
import { envConfig } from '../envConfig';
import { getCurrentLogger } from '../logger';
import { getCloudTasksClient } from './client';

/**
 * Parameters for creating a Cloud Task
 * @interface CreateCloudTasksParams
 * @property {string} queue - The name of the queue to create the task in
 * @property {string} audience - The HTTP target handler base URL
 * @property {string} url - The URL to send the task request to
 * @property {Record<string, any>} [payload] - Optional payload to send with the task
 * @property {number} [inSeconds] - Optional delay in seconds before executing the task
 * @property {Record<string, string>} [headers] - Optional HTTP headers to include with the request
 * @property {TaskEntityType} entityType - The type of entity associated with the task
 * @property {string} entityId - The ID of the entity associated with the task
 * @property {TaskType} type - The type of task to be executed
 */
interface CreateCloudTasksParams {
  queue: string;
  audience: string;
  url: string;
  payload?: Record<string, unknown>;
  inSeconds?: number;
  headers?: Record<string, string>;
  taskId: string;
}

type CloudTask = protos.google.cloud.tasks.v2.ITask;

/**
 * Creates a new Cloud Task with the specified parameters
 * @param {CreateCloudTasksParams} params - Parameters for creating the task
 * @returns {Promise<protos.google.cloud.tasks.v2.ITask>} The created task
 * @throws {Error} If required parameters are missing
 */
// TODO: handle error
const createCloudTasks = async (
  params: CreateCloudTasksParams,
): Promise<CloudTask | null> => {
  const logger = getCurrentLogger();
  const { projectId, location, cloudTaskServiceAccount } = envConfig;

  const { queue, audience, headers, url, payload, inSeconds, taskId } = params;

  const client = getCloudTasksClient();
  const parent = client.queuePath(projectId as string, location, queue);

  const cloudTask: CloudTask = {
    name: `${parent}/tasks/${taskId}`,
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
        'X-Task-ID': taskId,
        ...headers,
      },
      httpMethod: 'POST',
      url,
      oidcToken: {
        serviceAccountEmail: cloudTaskServiceAccount,
        audience,
      },
    },
    dispatchDeadline: {
      seconds: 1800,
    },
  };

  if (payload) {
    try {
      // biome-ignore lint/style/noNonNullAssertion: fix later
      cloudTask.httpRequest!.body = Buffer.from(
        JSON.stringify(payload),
      ).toString('base64');
    } catch (error) {
      logger.error({ error, payload }, 'Failed to serialize payload');
      throw new Error('Invalid payload: Failed to serialize to JSON');
    }
  }

  if (inSeconds) {
    cloudTask.scheduleTime = {
      seconds: Math.floor(inSeconds + Date.now() / 1000),
    };
  }

  const request = { parent, task: cloudTask };
  const [response] = await client.createTask(request);

  return response;
};

export { type CreateCloudTasksParams, createCloudTasks };
