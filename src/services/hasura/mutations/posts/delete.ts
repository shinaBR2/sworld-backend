import { graphql } from '../../generated-graphql';
import { DeletePostMutation } from '../../generated-graphql/graphql';
import { hasuraClient } from '../client';

const DELETE_POST = graphql(/* GraphQL */ `
  mutation DeletePost($id: uuid!) {
    delete_posts_by_pk(id: $id) {
      id
    }
  }
`);

const deletePost = async (id: string): Promise<any> => {
  const variables = {
    id,
  };

  const response = await hasuraClient.request<DeletePostMutation, any>({
    document: DELETE_POST.toString(),
    variables,
  });
  return response.delete_posts_by_pk?.id;
};

export { deletePost };
