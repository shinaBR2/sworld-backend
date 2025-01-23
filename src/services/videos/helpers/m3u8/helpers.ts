import path from 'path';

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

const parseM3U8Content = async (
  m3u8Url: string,
  excludePattern?: RegExp
): Promise<{
  modifiedContent: string;
  segments: { included: string[]; excluded: string[] };
}> => {
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

export { parseM3U8Content };
