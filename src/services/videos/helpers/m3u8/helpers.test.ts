import { describe, expect, vi, test } from 'vitest';
import { parseM3U8Content } from './helpers';

describe('M3U8 Processing', () => {
  // Helper to normalize line endings and whitespace
  const normalizeContent = (content: string) =>
    content
      .trim()
      .split('\n')
      .map(line => line.trim())
      .join('\n');

  describe('parseM3U8Content', () => {
    const baseUrl = 'https://example.com';
    const excludePattern = /\/adjump\//;

    test('should handle m3u8 with DISCONTINUITY markers', async () => {
      const content = `
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:10
        #EXTINF:3,
        segment1.ts
        #EXT-X-DISCONTINUITY
        #EXTINF:5.96,
        /adjump/ad1.ts
        #EXTINF:1.96,
        /adjump/ad2.ts
        #EXT-X-DISCONTINUITY
        #EXTINF:3,
        segment2.ts
        #EXT-X-ENDLIST
      `;

      const expected = normalizeContent(`
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:10
        #EXTINF:3,
        segment1.ts
        #EXTINF:3,
        segment2.ts
        #EXT-X-ENDLIST
      `);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(content),
      });
      global.fetch = mockFetch;

      const { modifiedContent, segments } = await parseM3U8Content(
        baseUrl,
        excludePattern
      );

      expect(normalizeContent(modifiedContent)).toBe(expected);
      expect(segments.included).toHaveLength(2);
      expect(segments.excluded).toHaveLength(2);
    });

    test('should handle m3u8 without DISCONTINUITY markers', async () => {
      const content = `
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:10
        #EXTINF:3,
        segment1.ts
        #EXTINF:5.96,
        /adjump/ad1.ts
        #EXTINF:3,
        segment2.ts
        #EXT-X-ENDLIST
      `;

      const expected = normalizeContent(`
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:10
        #EXTINF:3,
        segment1.ts
        #EXTINF:3,
        segment2.ts
        #EXT-X-ENDLIST
      `);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(content),
      });
      global.fetch = mockFetch;

      const { modifiedContent, segments } = await parseM3U8Content(
        baseUrl,
        excludePattern
      );

      expect(normalizeContent(modifiedContent)).toBe(expected);
      expect(segments.included).toHaveLength(2);
      expect(segments.excluded).toHaveLength(1);
    });

    test('should handle m3u8 with no ads', async () => {
      const content = `
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:10
        #EXTINF:3,
        segment1.ts
        #EXTINF:3,
        segment2.ts
        #EXTINF:3,
        segment3.ts
        #EXT-X-ENDLIST
      `;

      const expected = normalizeContent(content);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(content),
      });
      global.fetch = mockFetch;

      const { modifiedContent, segments } = await parseM3U8Content(
        baseUrl,
        excludePattern
      );

      expect(normalizeContent(modifiedContent)).toBe(expected);
      expect(segments.included).toHaveLength(3);
      expect(segments.excluded).toHaveLength(0);
    });

    test('should handle malformed m3u8', async () => {
      const content = `
        #EXTM3U
        #EXT-X-VERSION:3
        #EXTINF:3,
        #EXTINF:3,
        segment1.ts
        /adjump/ad1.ts
        segment2.ts
      `;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(content),
      });
      global.fetch = mockFetch;

      const { modifiedContent, segments } = await parseM3U8Content(
        baseUrl,
        excludePattern
      );

      // Should still produce valid output even with malformed input
      expect(segments.included.length).toBeGreaterThanOrEqual(0);
      expect(normalizeContent(modifiedContent)).toMatch(/#EXTM3U/);
    });
  });
});
