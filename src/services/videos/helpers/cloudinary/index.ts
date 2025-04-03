import { v2 as cloudinary } from 'cloudinary';
import { existsSync } from 'fs';
import { CustomError } from 'src/utils/custom-error';
import { envConfig } from 'src/utils/envConfig';
import { logger } from 'src/utils/logger';

cloudinary.config({
  cloud_name: envConfig.cloudinaryName,
  api_key: envConfig.cloudinaryApiKey,
  api_secret: envConfig.cloudinaryApiSecret,
});

const uploadFromLocalFilePath = async (localFilePath: string, options = {}) => {
  if (!localFilePath || !existsSync(localFilePath)) {
    throw new Error('Invalid or missing file path');
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      ...options,
    });

    if (uploadResult) {
      return uploadResult.secure_url;
    }

    throw new Error('Upload failed: No result returned');
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
};

interface UploadRemoteMp4ToHLSOptions {
  folder?: string;
  publicId?: string;
  resourceType?: string;
  overwrite?: boolean;
  invalidate?: boolean;
  timeout?: number;
  maxDuration?: number;
}

const uploadRemoteMp4ToHLS = async (videoUrl: string, options: UploadRemoteMp4ToHLSOptions = {}) => {
  if (!videoUrl) {
    throw new Error('Invalid or missing video URL');
  }

  try {
    const uploadResult = await cloudinary.uploader.upload_large(videoUrl, {
      resource_type: 'video',
      async: true,
      folder: options.folder || 'videos',
      chunk_size: 6000000,
      public_id: options.publicId || 'test-video-frieren',
      // overwrite: options.overwrite !== undefined ? options.overwrite : true,
      // invalidate: options.invalidate !== undefined ? options.invalidate : true,
      eager: [
        {
          streaming_profile: 'hd',
          format: 'm3u8',
        },
      ],
      eager_async: true,
      eager_notification_url:
        envConfig.cloudinaryNotificationUrl || 'https://8a04-171-227-168-18.ngrok-free.app/cloudinary-webhook',
      max_duration: options.maxDuration,
      video_analytics: true,
    });

    logger.info(uploadResult, 'upload result (ASYNC)');

    if (!uploadResult) {
      throw new Error('Upload failed: No result returned');
    }

    // Return both the original video URL and the HLS URL
    return {
      originalUrl: uploadResult.secure_url,
      hlsUrl: uploadResult.eager?.[0]?.secure_url || null,
      publicId: uploadResult.public_id,
      duration: uploadResult.duration,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      assetId: uploadResult.asset_id,
      bytes: uploadResult.bytes,
    };
  } catch (error) {
    logger.error(error, 'Cloudinary HLS conversion failed:');
    throw new CustomError('Failed to upload and convert video to HLS', {
      originalError: error as Error,
      shouldRetry: true,
      context: { videoUrl },
    });
  }
};

const checkBatchStatus = async (batchId: string): Promise<any> => {
  if (!batchId) {
    throw new Error('Invalid or missing batch ID');
  }

  try {
    // The Cloudinary Admin API is required to check batch status
    // const result = await cloudinary.api.resources_by_asset_ids([batchId]);
    const result = await cloudinary.api.resource(batchId);

    logger.info(result, 'check batch status result');

    return result;
  } catch (error) {
    logger.error(error, 'Failed to check batch status:');
    throw new CustomError('Failed to check Cloudinary batch status', {
      originalError: error as Error,
      shouldRetry: true,
      context: { batchId },
    });
  }
};

export { checkBatchStatus, uploadFromLocalFilePath, uploadRemoteMp4ToHLS };
