import { CloudTasksClient, protos } from '@google-cloud/tasks';
import { envConfig } from './envConfig';
import { v5 as uuidv5 } from 'uuid';
import { uuidNamespaces } from './systemConfig';

let client: CloudTasksClient | null = null;

const getCloudTasksClient = (): CloudTasksClient => {
  if (!client) {
    client = new CloudTasksClient();
  }
  return client;
};

interface CreateCloudTasksParams {
  queue: string;
  url: string;
  payload?: string;
  inSeconds?: number;
  headers?: Record<string, string>;
}

type Task = protos.google.cloud.tasks.v2.ITask;

const createCloudTasks = async (params: CreateCloudTasksParams) => {
  const projectId = envConfig.projectId;
  const location = envConfig.location;

  if (!projectId || !location) {
    throw new Error('Missing projectId or location');
  }

  const { queue, headers, url, payload, inSeconds } = params;

  if (!url || !queue) {
    throw new Error('Missing url or queue');
  }

  const client = getCloudTasksClient();
  const parent = client.queuePath(projectId, location, queue);
  const taskId = uuidv5(
    JSON.stringify({
      url,
      payload,
      queue,
    }),
    uuidNamespaces.cloudTask
  );

  const task: Task = {
    name: `${parent}/tasks/${taskId}`,
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      httpMethod: 'POST',
      url,
    },
  };

  if (payload) {
    const stringifiedPayload =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    task.httpRequest!.body = Buffer.from(stringifiedPayload).toString('base64');
  }

  if (inSeconds) {
    task.scheduleTime = {
      seconds: Math.floor(inSeconds + Date.now() / 1000),
    };
  }

  const request = { parent, task };
  const [response] = await client.createTask(request);

  return response;
};

export { createCloudTasks };
