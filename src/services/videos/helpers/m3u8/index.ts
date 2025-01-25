import * as os from 'os';
import path from 'path';
import { writeFile } from 'fs/promises';
import { generateTempDir, createDirectory, cleanupDirectory } from '../file';
import { getDownloadUrl, uploadFolderParallel } from '../gcp-cloud-storage';
import { logger } from 'src/utils/logger';
import { downloadSegments, parseM3U8Content } from './helpers';

interface ProcessOptions {
  excludePattern?: RegExp;
  maxSegmentSize?: number;
}

interface ProcessResult {
  playlistUrl: string;
  segments: {
    included: string[];
    excluded: string[];
  };
}

async function processM3U8(
  m3u8Url: string,
  storagePath: string,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const tempDir = generateTempDir();

  try {
    await createDirectory(tempDir);

    logger.info({ m3u8Url, storagePath }, 'Starting M3U8 processing');

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

    // Save modified playlist
    const playlistPath = path.join(tempDir, 'playlist.m3u8');
    await writeFile(playlistPath, modifiedContent);

    await downloadSegments(segments.included, tempDir, options.maxSegmentSize);

    logger.info({ storagePath }, 'Uploading to Cloud Storage');
    // Upload to Cloud Storage
    await uploadFolderParallel(tempDir, storagePath);

    // Clean up and return
    await cleanupDirectory(tempDir);

    const result = {
      playlistUrl: getDownloadUrl(path.join(storagePath, 'playlist.m3u8')),
      segments,
    };

    logger.info(
      { playlistUrl: result.playlistUrl },
      'M3U8 processing completed'
    );
    return result;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        m3u8Url,
        storagePath,
      },
      'M3U8 processing failed'
    );
    await cleanupDirectory(tempDir);
    throw error;
  }
}

export { processM3U8, ProcessOptions, ProcessResult };
