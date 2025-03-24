import { graphql } from '../../generated-graphql';
import { Posts_Set_Input, UpdatePostMutation } from '../../generated-graphql/graphql';
import { hasuraClient } from '../client';

const UPDATE_POST = graphql(/* GraphQL */ `
  mutation UpdatePost($id: uuid!, $set: posts_set_input!) {
    update_posts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`);

const updatePost = async (id: string, post: Posts_Set_Input): Promise<any> => {
  const variables = {
    id,
    set: post,
  };

  const response = await hasuraClient.request<UpdatePostMutation, any>({
    document: UPDATE_POST.toString(),
    variables,
  });
  return response.update_posts_by_pk?.id;
};

export { updatePost };
