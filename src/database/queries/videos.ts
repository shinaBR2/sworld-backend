import { Video } from '../models/video';

interface FinalizeVideoProps {
  id: string;
  source: string;
  thumbnailUrl: string;
}

const finalizeVideo = async (props: FinalizeVideoProps) => {
  const { id, source, thumbnailUrl } = props;

  const [updatedCount] = await Video.update(
    { source, status: 'ready', thumbnail_url: thumbnailUrl },
    {
      where: {
        id,
      },
    }
  );

  if (updatedCount === 0) {
    throw new Error(`Video with ID ${id} not found`);
  }

  return updatedCount;
};

export { finalizeVideo };
