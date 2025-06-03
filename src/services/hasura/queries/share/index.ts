import { hasuraClient } from '../../client';
import { graphql } from '../../generated-graphql';
import { PlaylistDetailQuery, PlaylistDetailQueryVariables } from '../../generated-graphql/graphql';

const GET_PLAYLIST_VIDEOS = graphql(/* GraphQL */ `
  query PlaylistDetail($id: uuid!) {
    playlist_by_pk(id: $id) {
      playlist_videos(where: { video: { status: { _eq: "ready" } } }) {
        video {
          id
          status
        }
      }
    }
  }
`);

const getPlaylistVideos = async (id: string): Promise<PlaylistDetailQuery> => {
  const variables = {
    id,
  };

  const response = await hasuraClient.request<PlaylistDetailQuery, PlaylistDetailQueryVariables>({
    document: GET_PLAYLIST_VIDEOS.toString(),
    variables: variables,
  });
  return response;
};

export { getPlaylistVideos };
