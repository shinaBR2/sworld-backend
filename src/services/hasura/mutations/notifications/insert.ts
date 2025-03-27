import { graphql } from '../../generated-graphql';
import { InsertNotificationMutation, Notifications_Insert_Input } from '../../generated-graphql/graphql';
import { hasuraClient } from '../client';

const INSERT_NOTIFICATION = graphql(/* GraphQL */ `
  mutation InsertNotification($object: notifications_insert_input!) {
    insert_notifications_one(object: $object) {
      id
    }
  }
`);

const insertPost = async (notification: Notifications_Insert_Input): Promise<any> => {
  const variables = {
    object: notification,
  };

  const response = await hasuraClient.request<InsertNotificationMutation, any>({
    document: INSERT_NOTIFICATION.toString(),
    variables,
  });
  return response.insert_notifications_one?.id;
};

export { insertPost };
