import * as os from 'os';
import path from 'path';
import { writeFile } from 'fs/promises';
import { generateTempDir, createDirectory, cleanupDirectory } from '../file';
import { getDownloadUrl, uploadFolderParallel } from '../gcp-cloud-storage';
import { logger } from 'src/utils/logger';
import {
  downloadSegments,
  parseM3U8Content,
  streamPlaylistFile,
  streamSegments,
} from './helpers';

interface ProcessOptions {
  excludePattern?: RegExp;
  maxSegmentSize?: number;
}

const streamM3U8 = async (
  m3u8Url: string,
  storagePath: string,
  options: ProcessOptions = {}
): Promise<string> => {
  try {
    logger.info({ m3u8Url, storagePath }, 'Starting M3U8 streaming');

    // Parse m3u8 and get segments
    const { modifiedContent, segments } = await parseM3U8Content(
      m3u8Url,
      options.excludePattern
    );

    logger.info(
      {
        includedCount: segments.included.length,
        excludedCount: segments.excluded.length,
      },
      'Parsed M3U8 content'
    );

    // Stream playlist file
    const playlistStoragePath = path.join(storagePath, 'playlist.m3u8');
    await streamPlaylistFile(modifiedContent, playlistStoragePath);

    // Stream segments in parallel
    await streamSegments(segments.included, storagePath);

    const result = {
      playlistUrl: getDownloadUrl(playlistStoragePath),
      segments,
    };

    logger.info(
      { playlistUrl: result.playlistUrl },
      'M3U8 streaming completed'
    );
    return result.playlistUrl;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        m3u8Url,
        storagePath,
      },
      'M3U8 streaming failed'
    );
    throw error;
  }
};

export { streamM3U8, ProcessOptions };
