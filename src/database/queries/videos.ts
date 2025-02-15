import { Op } from 'sequelize';
import { Video, VideoTS } from '../models/video';

/**
 * Properties required to finalize a video
 */
interface FinalizeVideoProps {
  /** Unique identifier of the video */
  id: string; // UUID type
  /** Processed video source URL */
  source: string;
  /** Generated thumbnail URL */
  thumbnailUrl: string;
  /** Calculated video duration */
  duration?: number;
}

const finalizeVideo = async (props: FinalizeVideoProps) => {
  const { id, source, thumbnailUrl, duration = null } = props;

  // TODO
  // Handle duration
  const [updatedCount] = await Video.update(
    { source, status: 'ready', thumbnail_url: thumbnailUrl, duration },
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

const getVideoMissingDuration = async () => {
  const query = {
    where: {
      [Op.or]: [{ duration: null }, { duration: 0 }],
    },
  };

  const videosWithoutDuration = await Video.findAll(query);

  return videosWithoutDuration as unknown as VideoTS[];
};

export { finalizeVideo, getVideoMissingDuration };
