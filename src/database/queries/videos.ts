import { Video } from '../models/video';

interface FinalizeVideoProps {
  id: string;
  source: string;
  thumbnailUrl: string;
}

const finalizeVideo = async (props: FinalizeVideoProps) => {
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
