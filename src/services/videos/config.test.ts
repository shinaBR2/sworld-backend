import { describe, it, expect } from 'vitest';
import { videoConfig } from './config';

describe('videoConfig', () => {
  it('has correct default concurrency limit', () => {
    expect(videoConfig.defaultConcurrencyLimit).toBe(5);
  });

  it('contains expected configuration keys', () => {
    const expectedKeys = ['defaultConcurrencyLimit', 'essentialHLSTags', 'excludePatterns'];

    expectedKeys.forEach(key => {
      expect(videoConfig).toHaveProperty(key);
    });
  });

  it('contains correct essential HLS tags', () => {
    const expectedTags = [
      '#EXTM3U',
      '#EXT-X-VERSION',
      '#EXT-X-TARGETDURATION',
      '#EXT-X-MEDIA-SEQUENCE',
      '#EXT-X-ENDLIST',
    ];

    expectedTags.forEach(tag => {
      expect(videoConfig.essentialHLSTags.has(tag)).toBe(true);
    });
    expect(videoConfig.essentialHLSTags.size).toBe(expectedTags.length);
  });

  it('contains correct exclude patterns', () => {
    const patterns = videoConfig.excludePatterns;
    expect(patterns).toHaveLength(3);

    const testUrls = ['/adjump/test.ts', '/ads/commercial.ts', '/commercial/video.ts', '/content/legitimate.ts'];

    expect(testUrls[0]).toMatch(patterns[0]); // adjump
    expect(testUrls[1]).toMatch(patterns[1]); // ads
    expect(testUrls[2]).toMatch(patterns[2]); // commercial
    expect(testUrls[3]).not.toMatch(patterns[0]);
    expect(testUrls[3]).not.toMatch(patterns[1]);
    expect(testUrls[3]).not.toMatch(patterns[2]);
  });

  it('has correct max file size limit', () => {
    expect(videoConfig.maxFileSize).toBe(4 * 1024 * 1024 * 1024);
  });

  it('has ffmpeg commands', () => {
    expect(videoConfig.ffmpegCommands).toEqual([
      '-map 0:v',
      '-map 0:a',
      '-map 0:s:0?',
      '-codec copy',
      '-codec:s webvtt',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls',
    ]);
  });
});
