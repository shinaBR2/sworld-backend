import { existsSync, statSync } from 'fs';
import path from 'path';
import { finishVideoProcess } from 'src/services/hasura/mutations/videos/finalize';
import { logger } from 'src/utils/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { videoConfig } from '../config';
import * as cloudinaryHelpers from '../helpers/cloudinary';
import * as ffmpegHelpers from '../helpers/ffmpeg';
import * as fileHelpers from '../helpers/file';
import * as gcpHelpers from '../helpers/gcp-cloud-storage';
import { convertVideo, type ConversionVideo } from './handler';

// Mock all external dependencies
vi.mock('../helpers/file');
vi.mock('../helpers/gcp-cloud-storage');
vi.mock('../helpers/ffmpeg');
vi.mock('../helpers/cloudinary');
vi.mock('src/utils/logger');
vi.mock('fs');

// Add proper Hasura mutation mock
vi.mock('src/services/hasura/mutations/videos/finalize', () => ({
  finishVideoProcess: vi.fn().mockResolvedValue({ id: 'notification-123' }),
}));

describe('convertVideo', () => {
  // Update mock data structure to match handler's ConversionVideo interface
  const mockData: ConversionVideo = {
    taskId: '123e4567-e89b-12d3-a456-426614174000',
    videoData: {
      id: '987fcdeb-89ab-12d3-a456-426614174000',
      videoUrl: 'https://example.com/video.mp4',
      userId: 'user-123',
    },
  };

  const tempDir = '/temp/test-dir';
  const mockPaths = {
    workingDir: tempDir,
    outputDir: path.join(tempDir, 'output'),
    inputPath: path.join(tempDir, 'input.mp4'),
    // Update pattern to use actual video ID from mockData
    thumbnailPathPattern: new RegExp(path.join(tempDir, `${mockData.videoData.id}--\\d+\\.jpg`).replace(/\\/g, '\\\\')),
  };
  const mockVideoDuration = 100;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock generateTempDir to return consistent path
    vi.mocked(fileHelpers.generateTempDir).mockReturnValue(tempDir);

    // Mock file existence checks
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ size: 1000000 } as any);

    // Mock successful file operations
    vi.mocked(fileHelpers.createDirectory).mockResolvedValue(undefined);
    vi.mocked(fileHelpers.downloadFile).mockResolvedValue(undefined);
    vi.mocked(fileHelpers.verifyFileSize).mockResolvedValue(undefined);
    vi.mocked(fileHelpers.cleanupDirectory).mockResolvedValue(undefined);

    // Mock successful conversions
    vi.mocked(ffmpegHelpers.convertToHLS).mockResolvedValue(undefined);
    vi.mocked(ffmpegHelpers.getDuration).mockResolvedValue(mockVideoDuration);
    vi.mocked(ffmpegHelpers.takeScreenshot).mockResolvedValue(undefined);

    // Mock successful uploads
    vi.mocked(cloudinaryHelpers.uploadFromLocalFilePath).mockResolvedValue('https://cloudinary.com/thumbnail.jpg');
    vi.mocked(gcpHelpers.uploadFolderParallel).mockResolvedValue(undefined);
    vi.mocked(gcpHelpers.getDownloadUrl).mockReturnValue('https://storage.googleapis.com/playlist.m3u8');

    // Mock logger
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should successfully convert a video', async () => {
    const playableUrl = await convertVideo(mockData);

    // Verify directories were created
    expect(fileHelpers.createDirectory).toHaveBeenCalledWith(mockPaths.workingDir);
    expect(fileHelpers.createDirectory).toHaveBeenCalledWith(mockPaths.outputDir);

    // Verify video download and verification
    expect(fileHelpers.downloadFile).toHaveBeenCalledWith(
      mockData.videoData.videoUrl, // ← Fix property access chain
      mockPaths.inputPath
    );
    expect(fileHelpers.verifyFileSize).toHaveBeenCalledWith(mockPaths.inputPath, videoConfig.maxFileSize);

    // Verify video conversion
    expect(ffmpegHelpers.getDuration).toHaveBeenCalledWith(mockPaths.inputPath);
    expect(ffmpegHelpers.convertToHLS).toHaveBeenCalledWith(mockPaths.inputPath, mockPaths.outputDir);
    expect(ffmpegHelpers.takeScreenshot).toHaveBeenCalledWith(
      mockPaths.inputPath,
      mockPaths.workingDir,
      // Update expectation to match actual video ID pattern
      expect.stringMatching(new RegExp(`${mockData.videoData.id}--\\d+\\.jpg`)),
      mockVideoDuration
    );

    // Verify uploads
    expect(cloudinaryHelpers.uploadFromLocalFilePath).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`${mockData.videoData.id}--\\d+\\.jpg`)),
      {
        asset_folder: mockData.videoData.userId,
      }
    );

    // Verify cloud storage upload
    expect(gcpHelpers.uploadFolderParallel).toHaveBeenCalledWith(
      mockPaths.outputDir,
      `videos/${mockData.videoData.userId}/${mockData.videoData.id}`
    );

    expect(finishVideoProcess).toHaveBeenCalledWith({
      taskId: mockData.taskId,
      notificationObject: {
        type: 'video-ready',
        entityId: mockData.videoData.id,
        entityType: 'video',
        user_id: mockData.videoData.userId,
      },
      videoId: mockData.videoData.id,
      videoUpdates: {
        source: 'https://storage.googleapis.com/playlist.m3u8',
        status: 'ready',
        thumbnailUrl: 'https://cloudinary.com/thumbnail.jpg',
        duration: mockVideoDuration,
      },
    });

    // Verify cleanup
    expect(fileHelpers.cleanupDirectory).toHaveBeenCalledWith(mockPaths.workingDir);
    expect(playableUrl).toBe('https://storage.googleapis.com/playlist.m3u8');
  });

  // Update all test cases to use proper error structure
  it('should throw error if directory creation fails', async () => {
    const error = new Error('Failed to create directory');
    vi.mocked(fileHelpers.createDirectory).mockRejectedValueOnce(error);

    await expect(convertVideo(mockData)).rejects.toThrow('Video conversion failed: Failed to create directory');
  });

  // Remove this obsolete test case
  // it('should throw error if database update fails', async () => {
  //   const error = new Error('Database update failed');
  //   vi.mocked(finalizeVideo).mockRejectedValueOnce(error);
  //   ...
  // });

  // Add new test case for Hasura mutation failure
  it('should throw error if finishVideoProcess fails', async () => {
    const error = new Error('Hasura mutation failed');
    vi.mocked(finishVideoProcess).mockRejectedValueOnce(error);

    await expect(convertVideo(mockData)).rejects.toThrow('Video conversion failed: Hasura mutation failed');
    expect(fileHelpers.cleanupDirectory).toHaveBeenCalledWith(mockPaths.workingDir);
    expect(logger.error).toHaveBeenCalled();
  });
});
