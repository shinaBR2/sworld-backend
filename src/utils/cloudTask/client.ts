import { CloudTasksClient } from '@google-cloud/tasks';

let client: CloudTasksClient | null = null;

/**
 * Returns a singleton instance of CloudTasksClient
 * @returns {CloudTasksClient} The Cloud Tasks client instance
 */
const getCloudTasksClient = (): CloudTasksClient => {
  if (!client) {
    client = new CloudTasksClient();
  }
  return client;
};

export { getCloudTasksClient };
