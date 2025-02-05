import { describe, it, expect } from 'vitest';
import { VIDEO_ERRORS, type VideoErrorCode, type ErrorCode } from './index';

describe('error-codes', () => {
  it('should contain all expected video error codes', () => {
    const expectedCodes = [
      'VIDEO_INVALID_FORMAT',
      'VIDEO_TOO_LARGE',
      'VIDEO_PROCESSING_FAILED',
      'VIDEO_NOT_FOUND',
      'VIDEO_CONVERSION_FAILED',
      'VIDEO_CONVERSION_TIMEOUT',
      'VIDEO_INVALID_RESOLUTION',
      'STORAGE_UPLOAD_FAILED',
      'STORAGE_DOWNLOAD_FAILED',
    ];

    const actualCodes = Object.values(VIDEO_ERRORS);
    expect(actualCodes).toHaveLength(expectedCodes.length);
    expectedCodes.forEach(code => {
      expect(actualCodes).toContain(code);
    });
  });

  it('should have matching key-value pairs', () => {
    // Video and conversion errors should have VIDEO_ prefix
    Object.entries(VIDEO_ERRORS).forEach(([key, value]) => {
      if (key.startsWith('VIDEO') || key.startsWith('CONVERSION')) {
        expect(value.startsWith('VIDEO_')).toBeTruthy();
      }
    });

    // Storage errors should have STORAGE_ prefix
    Object.entries(VIDEO_ERRORS).forEach(([key, value]) => {
      if (key.startsWith('STORAGE')) {
        expect(value.startsWith('STORAGE_')).toBeTruthy();
      }
    });
  });

  // Type checking tests (these will fail at compile time if types are wrong)
  it('should maintain type safety', () => {
    const testVideoErrorCode = (code: VideoErrorCode) => code;
    const testErrorCode = (code: ErrorCode) => code;

    // Valid assignments - should compile
    testVideoErrorCode(VIDEO_ERRORS.VIDEO_NOT_FOUND);
    testErrorCode(VIDEO_ERRORS.STORAGE_UPLOAD_FAILED);

    // @ts-expect-error - Invalid error code
    testVideoErrorCode('INVALID_CODE');

    // @ts-expect-error - Invalid error code
    testErrorCode('RANDOM_ERROR');
  });
});
