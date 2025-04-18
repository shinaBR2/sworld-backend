import { existsSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { finishVideoProcess } from 'src/services/hasura/mutations/videos/finalize';
import { logger } from 'src/utils/logger';
import { videoConfig } from '../config';
import { uploadFromLocalFilePath } from '../helpers/cloudinary';
import { convertToHLS, getDuration, takeScreenshot } from '../helpers/ffmpeg';
import { cleanupDirectory, createDirectory, downloadFile, generateTempDir, verifyFileSize } from '../helpers/file';
import { getDownloadUrl, uploadFolderParallel } from '../helpers/gcp-cloud-storage';

interface VideoData {
  id: string;
  videoUrl: string;
  userId: string;
}

export interface ConversionVideo {
  taskId: string;
  videoData: VideoData;
}

/**
 * Handles the complete video conversion process from source URL to HLS format
 * including downloading, converting, generating thumbnail, and uploading to cloud storage
 *
 * @param data ConversionVideo object containing taskId and videoData (which includes video ID, source URL, and user ID)
 * @returns Promise resolving to the updated video record
 * @throws Error if any step in the conversion process fails
 */
export const convertVideo = async (data: ConversionVideo) => {
  const { taskId, videoData } = data;
  const { id, videoUrl, userId } = videoData;
  const workingDir = generateTempDir();
  const outputDir = path.join(workingDir, 'output');
  const thumbnailFilename = `${id}--${Date.now()}.jpg`;
  const thumbnailPath = path.join(workingDir, thumbnailFilename);
  const inputPath = path.join(workingDir, 'input.mp4');

  try {
    // Step 1: Create temporary working directories
    await createDirectory(workingDir);
    await createDirectory(outputDir);
    logger.debug(`Created working directories: ${workingDir}, ${outputDir}`);

    // Step 2: Download and verify source video
    await downloadFile(videoUrl, inputPath);
    await verifyFileSize(inputPath, videoConfig.maxFileSize);
    logger.debug(`Downloaded and verified source video: ${inputPath}`);

    // Step 3: Convert video to HLS format
    await convertToHLS(inputPath, outputDir);

    const fileCount = readdirSync(outputDir).length;
    logger.info(`HLS converted with ${fileCount} files`);

    // Verify input file still exists and check its size after conversion
    if (!existsSync(inputPath)) {
      throw new Error('Input file missing after HLS conversion');
    }
    const stats = statSync(inputPath);
    logger.debug(`HLS conversion complete. Input file size: ${stats.size} bytes`);

    // Step 4: Generate and upload thumbnail
    const videoDuration = await getDuration(inputPath);
    await takeScreenshot(inputPath, workingDir, thumbnailFilename, videoDuration);
    if (!existsSync(thumbnailPath)) {
      throw new Error('Screenshot file not created');
    }
    const thumbnailUrl = await uploadFromLocalFilePath(thumbnailPath, {
      asset_folder: userId,
    });
    logger.debug(`Generated and uploaded thumbnail: ${thumbnailUrl}`);

    // Step 5: Upload converted video files to cloud storage
    const outputPath = path.join('videos', userId, id).split(path.sep).filter(Boolean).join('/');

    await uploadFolderParallel(outputDir, outputPath);
    const playlistUrl = getDownloadUrl(`${outputPath}/playlist.m3u8`);
    logger.info(`Uploaded converted files to cloud storage: ${playlistUrl}`);

    await finishVideoProcess({
      taskId,
      notificationObject: {
        type: 'video-ready',
        entityId: id,
        entityType: 'video',
        user_id: userId,
      },
      videoId: id,
      videoUpdates: {
        source: playlistUrl,
        status: 'ready',
        thumbnailUrl,
        duration: videoDuration,
      },
    });
    return playlistUrl;
  } catch (error) {
    logger.error(error, `Video conversion failed for ID ${id}`);
    throw new Error(`Video conversion failed: ${(error as Error).message}`);
  } finally {
    try {
      await cleanupDirectory(workingDir);
      logger.debug(`Cleaned up working directory: ${workingDir}`);
    } catch (cleanupError) {
      logger.error(cleanupError, `Failed to clean up working directory: ${workingDir}`);
    }
  }
};
