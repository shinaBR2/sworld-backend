import { graphql } from '../../generated-graphql';
import { FinalizeVideoMutation, FinalizeVideoMutationVariables } from '../../generated-graphql/graphql';
import { hasuraClient } from '../client';

const INSERT_NOTIFICATION = graphql(/* GraphQL */ `
  mutation FinalizeVideo($taskId: uuid!, $notificationObject: notifications_insert_input!) {
    update_tasks(where: { task_id: { _eq: $taskId } }, _set: { status: "completed" }) {
      affected_rows
      returning {
        id
      }
    }

    insert_notifications_one(object: $notificationObject) {
      id
    }
  }
`);

const finishVideoProcess = async (variables: FinalizeVideoMutationVariables): Promise<string> => {
  const response = await hasuraClient.request<FinalizeVideoMutation, FinalizeVideoMutationVariables>({
    document: INSERT_NOTIFICATION.toString(),
    variables,
  });
  return response.insert_notifications_one?.id;
};

export { finishVideoProcess };
