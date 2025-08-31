import path from 'node:path';
import { Readable } from 'node:stream';
import { Parser } from 'm3u8-parser';
import { CustomError } from 'src/utils/custom-error';
import { HTTP_ERRORS } from 'src/utils/error-codes';
import { fetchWithError } from 'src/utils/fetch';
import { logger } from 'src/utils/logger';
import { systemConfig } from 'src/utils/systemConfig';
import { videoConfig } from '../../config';
import { downloadFile, verifyFileSize } from '../file';
import { streamFile } from '../gcp-cloud-storage';

interface HLSSegment {
  url: string;
  name: string;
  duration?: number;
}
interface ParsedResult {
  modifiedContent: string;
  segments: {
    included: HLSSegment[];
    excluded: HLSSegment[];
  };
  duration: number;
}

const isAds = (segmentUrl: string, excludePatterns: RegExp[]) => {
  return excludePatterns.some((pattern) => pattern.test(segmentUrl));
};

/**
 * Parse M3U8 playlist and filter out ad segments
 * @param m3u8Url - URL of the M3U8 playlist
 * @param excludePatterns - Array of RegExp to match ad segment URLs (e.g., /\/adjump\//)
 * @returns {
 *   modifiedContent: Clean M3U8 content without ads,
 *   segments: {
 *     included: Array of non-ad segment URLs to download,
 *     excluded: Array of ad segment URLs that were filtered out
 *   }
 * }
 *
 * Example input:
 * #EXTM3U
 * #EXT-X-VERSION:3
 * #EXTINF:3,
 * segment1.ts
 * #EXT-X-DISCONTINUITY
 * #EXTINF:5.96,
 * /adjump/ad1.ts
 * #EXT-X-DISCONTINUITY
 * #EXTINF:3,
 * segment2.ts
 *
 * Example output:
 * #EXTM3U
 * #EXT-X-VERSION:3
 * #EXTINF:3,
 * segment1.ts
 * #EXTINF:3,
 * segment2.ts
 */
const parseM3U8Content = async (
  m3u8Url: string,
  excludePatterns: RegExp[] = [],
): Promise<ParsedResult> => {
  const response = await fetchWithError(m3u8Url);
  const content = await response.text();
  const parser = new Parser();
  parser.push(content);
  parser.end();

  const manifest = parser.manifest;
  const segments = {
    included: [] as HLSSegment[],
    excluded: [] as HLSSegment[],
  };

  let modifiedContent = '';
  let totalDuration = 0;

  // Add header tags
  if (manifest.version) {
    modifiedContent += `#EXTM3U\n`;
    modifiedContent += `#EXT-X-VERSION:${manifest.version}\n`;
  }

  // Add playlist type if present
  if (manifest.playlistType) {
    modifiedContent += `#EXT-X-PLAYLIST-TYPE:${manifest.playlistType}\n`;
  }

  // Add target duration
  if (manifest.targetDuration) {
    modifiedContent += `#EXT-X-TARGETDURATION:${manifest.targetDuration}\n`;
  }

  // Process segments
  let segmentIndex = 0;
  manifest.segments?.forEach((segment) => {
    const segmentUrl = new URL(segment.uri, m3u8Url).toString();

    if (isAds(segmentUrl, excludePatterns)) {
      segments.excluded.push({
        url: segmentUrl,
        name: '',
      });
    } else {
      // Include non-ad segment
      if (segment.duration) {
        modifiedContent += `#EXTINF:${segment.duration},\n`;
        totalDuration += segment.duration;
        const segmentName = `${segmentIndex++}.ts`;
        modifiedContent += `${segmentName}\n`;

        // modifiedContent += `${segment.uri}\n`;
        segments.included.push({
          url: segmentUrl,
          name: segmentName,
          duration: segment.duration,
        });
      }
    }
  });

  // Add endlist if present
  if (manifest.endList) {
    modifiedContent += '#EXT-X-ENDLIST\n';
  }

  return { modifiedContent, segments, duration: Math.round(totalDuration) };
};

// TODO - remove if downloadSegments is unused
const BATCH_SIZE = 5;

// chunks only used in downloadSegments
const chunks = <T>(array: T[], size: number): T[][] => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// TODO remove if unused, use stream instead
/**
 * Download segments in batches and process them sequentially
 * @param segments - Array of segment URLs to download
 * @param tempDir - Temporary directory to store downloaded segments
 * @param maxSegmentSize - Optional maximum size (in bytes) for each segment
 *
 * @throws Error if any segment fails to download
 *
 * Behavior:
 * - Processes segments in batches of 5
 * - Downloads segments sequentially within each batch
 * - Verifies file size if maxSegmentSize is provided
 * - Stops entire process if any segment fails
 *
 * Example:
 * ```typescript
 * await downloadSegments([
 *   'https://example.com/segment1.ts',
 *   'https://example.com/segment2.ts'
 * ], '/tmp/123', 1024 * 1024);
 * ```
 */
const downloadSegments = async (segments: string[], tempDir: string, maxSegmentSize?: number) => {
  const batches = chunks(segments, BATCH_SIZE);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (segmentUrl) => {
        const segmentName = path.basename(segmentUrl);
        const localPath = path.join(tempDir, segmentName);

        logger.info({ segmentName, segmentUrl }, 'Downloading segment');
        await downloadFile(segmentUrl, localPath);

        if (maxSegmentSize) {
          await verifyFileSize(localPath, maxSegmentSize);
        }

        logger.info({ segmentName }, 'Successfully downloaded segment');
      }),
    );
  }
};

/**
 * Streams an M3U8 playlist file to cloud storage.
 *
 * @param content - The raw content of the M3U8 playlist
 * @param storagePath - The destination path in cloud storage
 * @returns A promise that resolves when the file is successfully streamed
 *
 * @remarks
 * - Converts the playlist content to a Node.js Readable stream
 * - Uses the Apple-specific MIME type for maximum compatibility
 * - Suitable for streaming both complete and partial playlist contents
 *
 * @example
 * ```typescript
 * const playlistContent = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\nindex.ts';
 * await streamPlaylistFile(playlistContent, 'videos/playlist.m3u8');
 * ```
 *
 * @throws {Error} Propagates any errors from the underlying stream operation
 */
const streamPlaylistFile = async (content: string, storagePath: string) => {
  const playlistStream = Readable.from(content);

  return streamFile({
    stream: playlistStream,
    storagePath,
    options: {
      contentType: 'application/vnd.apple.mpegurl',
    },
  });
};

/**
 * Downloads a video segment from URL and streams it to Cloud Storage
 * @param segmentUrl Source URL of the video segment (.ts file)
 * @param storagePath Destination path in Cloud Storage (e.g., 'videos/123/segments/segment.ts')
 * @returns Promise that resolves when upload is complete
 */
const streamSegmentFile = async (segmentUrl: string, storagePath: string) => {
  const response = await fetchWithError(segmentUrl, {
    timeout: systemConfig.defaultExternalRequestTimeout,
  });
  if (!response.body) {
    throw new CustomError('Failed to fetch segment', {
      errorCode: HTTP_ERRORS.EMPTY_RESPONSE,
      shouldRetry: false,
      context: {
        segmentUrl,
        storagePath,
        responseStatus: response.statusText,
        statusCode: response.status,
      },
    });
  }

  return streamFile({
    stream: Readable.fromWeb(response.body as any),
    storagePath,
    options: {
      contentType: 'video/MP2T', // Standard MIME type for .ts segment files
    },
  });
};

interface StreamSegmentsParams {
  segments: HLSSegment[];
  /** Base path in Cloud Storage to store the segments */
  baseStoragePath: string;
  options?: {
    /** Optional concurrency limit for streaming segments */
    concurrencyLimit?: number;
  };
}

const streamSegments = async (params: StreamSegmentsParams) => {
  const { segments, baseStoragePath, options } = params;
  const { defaultConcurrencyLimit } = videoConfig;
  const concurrencyLimit = options?.concurrencyLimit || defaultConcurrencyLimit;

  for (let i = 0; i < segments.length; i += concurrencyLimit) {
    const batch = segments.slice(i, i + concurrencyLimit);

    await Promise.all(
      batch.map(async (segment) => {
        const segmentFileName = segment.name;
        const segmentStoragePath = path.join(baseStoragePath, segmentFileName as string);

        await streamSegmentFile(segment.url, segmentStoragePath);
      }),
    );
  }
};

export {
  downloadSegments,
  parseM3U8Content,
  streamPlaylistFile,
  streamSegmentFile,
  streamSegments,
};
