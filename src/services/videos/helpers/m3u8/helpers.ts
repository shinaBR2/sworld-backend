import path from 'path';
import { logger } from 'src/utils/logger';
import { downloadFile, verifyFileSize } from '../file';

const ESSENTIAL_TAGS = new Set([
  '#EXTM3U',
  '#EXT-X-VERSION',
  '#EXT-X-TARGETDURATION',
  '#EXT-X-MEDIA-SEQUENCE',
  '#EXT-X-ENDLIST',
]);

const normalizeContent = (content: string) => {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
};

interface ParsedResult {
  modifiedContent: string;
  segments: { included: string[]; excluded: string[] };
}

/**
 * Parse M3U8 playlist and filter out ad segments
 * @param m3u8Url - URL of the M3U8 playlist
 * @param excludePattern - RegExp to match ad segment URLs (e.g., /\/adjump\//)
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
  excludePattern?: RegExp
): Promise<ParsedResult> => {
  const response = await fetch(m3u8Url);
  if (!response.ok) {
    throw new Error(`Failed to fetch m3u8: ${response.statusText}`);
  }

  const content = normalizeContent(await response.text());
  const lines = content.split('\n');
  const segments = {
    included: [] as string[],
    excluded: [] as string[],
  };

  let modifiedContent = '';

  // Process lines sequentially
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Keep essential HLS tags
    if (ESSENTIAL_TAGS.has(line.split(':')[0])) {
      modifiedContent += line + '\n';
      continue;
    }

    // Handle EXTINF and its corresponding segment
    if (line.startsWith('#EXTINF')) {
      // Look ahead for the segment URL
      const nextLine = lines[i + 1];

      // Skip if no segment URL follows
      if (!nextLine || !nextLine.includes('.ts')) {
        continue;
      }

      // Check if this is an ad segment
      const segmentUrl = new URL(nextLine, m3u8Url).toString();
      if (!excludePattern || !excludePattern.test(segmentUrl)) {
        // Include non-ad segment
        modifiedContent += line + '\n';
        modifiedContent += path.basename(nextLine) + '\n';
        segments.included.push(segmentUrl);
      } else {
        segments.excluded.push(segmentUrl);
      }

      // Skip the segment URL line since we've processed it
      i++;
    }
    // Skip DISCONTINUITY markers and other tags
  }

  return { modifiedContent, segments };
};

const BATCH_SIZE = 5;

const chunks = <T>(array: T[], size: number): T[][] => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

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
const downloadSegments = async (
  segments: string[],
  tempDir: string,
  maxSegmentSize?: number
) => {
  const batches = chunks(segments, BATCH_SIZE);

  for (const batch of batches) {
    // Process each segment in the batch sequentially
    for (const segmentUrl of batch) {
      const segmentName = path.basename(segmentUrl);
      const localPath = path.join(tempDir, segmentName);

      try {
        logger.info({ segmentName, segmentUrl }, 'Downloading segment');
        await downloadFile(segmentUrl, localPath);

        if (maxSegmentSize) {
          await verifyFileSize(localPath, maxSegmentSize);
        }

        logger.info({ segmentName }, 'Successfully downloaded segment');
      } catch (error) {
        logger.error(
          {
            segmentName,
            segmentUrl,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to download segment'
        );
        // If any segment fails, stop the process
        throw error;
      }
    }
  }
};

export { parseM3U8Content, downloadSegments };
