import { graphql } from '../../generated-graphql';
import { SaveSubtitleMutation, SaveSubtitleMutationVariables } from '../../generated-graphql/graphql';
import { hasuraClient } from '../../client';

const SAVE_SUBTITLE = graphql(/* GraphQL */ `
  mutation SaveSubtitle($id: uuid!, $object: subtitles_set_input!) {
    update_subtitles_by_pk(pk_columns: { id: $id }, _set: $object) {
      id
    }
  }
`);

interface SubtitleInput {
  video_id: string;
  language: string;
  url: string;
  storage_path: string;
  is_default: boolean;
  created_by: string;
}

const saveSubtitle = async (id: string, input: SubtitleInput) => {
  const response = await hasuraClient.request<SaveSubtitleMutation, SaveSubtitleMutationVariables>({
    document: SAVE_SUBTITLE.toString(),
    variables: {
      id,
      object: input,
    },
  });

  return response.update_subtitles_by_pk;
};

export { SubtitleInput, saveSubtitle };
