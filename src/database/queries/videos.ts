import { Video } from '../models/video';

const finalizeVideo = async (props: any) => {
  const { id, source, thumbnailUrl } = props;

  return await Video.update(
    { source, status: 'ready', thumbnail_url: thumbnailUrl },
    {
      where: {
        id,
      },
    }
  );
};

export { finalizeVideo };
