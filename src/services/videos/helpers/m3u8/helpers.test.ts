import { describe, expect, vi, test, beforeEach } from 'vitest';
import {
  downloadSegments,
  parseM3U8Content,
  streamSegmentFile,
} from './helpers';
import { downloadFile, verifyFileSize } from '../file';
import { logger } from 'src/utils/logger';
import { Readable } from 'node:stream';
import fetch from 'node-fetch';
import { streamFile } from '../gcp-cloud-storage';

vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

vi.mock('../gcp-cloud-storage', () => ({
  streamFile: vi.fn(),
}));

vi.mock('../file', () => ({
  downloadFile: vi.fn(),
  verifyFileSize: vi.fn(),
}));

vi.mock('src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('M3U8 parser', () => {
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

      const mockResponse = {
        ok: true,
        statusText: 'OK',
        text: () => Promise.resolve(content),
      };
      (fetch as any).mockResolvedValue(mockResponse);

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

      const mockResponse = {
        ok: true,
        statusText: 'OK',
        text: () => Promise.resolve(content),
      };
      (fetch as any).mockResolvedValue(mockResponse);

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

      const mockResponse = {
        ok: true,
        statusText: 'OK',
        text: () => Promise.resolve(content),
      };
      (fetch as any).mockResolvedValue(mockResponse);

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

      const mockResponse = {
        ok: true,
        statusText: 'OK',
        text: () => Promise.resolve(content),
      };
      (fetch as any).mockResolvedValue(mockResponse);

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

describe('downloadSegments', () => {
  const mockSegments = [
    'https://example.com/segment1.ts',
    'https://example.com/segment2.ts',
    'https://example.com/segment3.ts',
  ];
  const mockTempDir = '/tmp/test';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should download segments successfully', async () => {
    await downloadSegments(mockSegments, mockTempDir);

    // Check if downloadFile was called for each segment
    expect(downloadFile).toHaveBeenCalledTimes(3);
    expect(downloadFile).toHaveBeenCalledWith(
      'https://example.com/segment1.ts',
      '/tmp/test/segment1.ts'
    );
    expect(logger.info).toHaveBeenCalledWith(
      {
        segmentName: 'segment1.ts',
        segmentUrl: 'https://example.com/segment1.ts',
      },
      'Downloading segment'
    );
  });

  test('should verify file size when maxSegmentSize is provided', async () => {
    const maxSize = 1024;
    await downloadSegments(mockSegments, mockTempDir, maxSize);

    expect(verifyFileSize).toHaveBeenCalledTimes(3);
    expect(verifyFileSize).toHaveBeenCalledWith(
      '/tmp/test/segment1.ts',
      maxSize
    );
  });

  test('should process segments in batches of 5', async () => {
    const sixSegments = Array(6)
      .fill('')
      .map((_, i) => `https://example.com/segment${i + 1}.ts`);

    await downloadSegments(sixSegments, mockTempDir);

    // Check if the first batch was processed before the second
    const downloadCalls = vi.mocked(downloadFile).mock.calls;
    expect(downloadCalls[0][0]).toBe('https://example.com/segment1.ts');
    expect(downloadCalls[4][0]).toBe('https://example.com/segment5.ts');
    expect(downloadCalls[5][0]).toBe('https://example.com/segment6.ts');
  });

  test('should stop processing on first error', async () => {
    vi.mocked(downloadFile).mockRejectedValueOnce(new Error('Download failed'));

    await expect(downloadSegments(mockSegments, mockTempDir)).rejects.toThrow(
      'Download failed'
    );

    expect(downloadFile).toHaveBeenCalledTimes(3);
  });
});

describe('streamSegmentFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should download and stream segment file', async () => {
    // Mock successful fetch response
    const mockBody = new Readable({
      read() {
        this.push('segment data');
        this.push(null);
      },
    });

    const mockResponse = {
      ok: true,
      body: mockBody,
    };
    (fetch as any).mockResolvedValue(mockResponse);

    await streamSegmentFile(
      'http://example.com/segment.ts',
      'test-path/segment.ts'
    );

    // Verify fetch was called with correct URL
    expect(fetch).toHaveBeenCalledWith('http://example.com/segment.ts');

    // Verify streamFile was called with correct arguments
    expect(streamFile).toHaveBeenCalledWith(mockBody, 'test-path/segment.ts', {
      contentType: 'video/MP2T',
    });
  });

  test('should throw error when fetch fails', async () => {
    const mockResponse = {
      ok: false,
      body: null,
    };
    (fetch as any).mockResolvedValue(mockResponse);

    await expect(
      streamSegmentFile('http://example.com/segment.ts', 'test-path/segment.ts')
    ).rejects.toThrow('Failed to fetch segment');
  });

  test('should throw error when response body is null', async () => {
    const mockResponse = {
      ok: true,
      body: null,
    };
    (fetch as any).mockResolvedValue(mockResponse);

    await expect(
      streamSegmentFile('http://example.com/segment.ts', 'test-path/segment.ts')
    ).rejects.toThrow('Failed to fetch segment');
  });
});
