const HTTP_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
};

const DATABASE_ERRORS = {
  DB_ERROR: 'DB_ERROR',
};

const VIDEO_ERRORS = {
  // Video upload/processing errors
  INVALID_VIDEO_FORMAT: 'VIDEO_INVALID_FORMAT',
  VIDEO_TOO_LARGE: 'VIDEO_TOO_LARGE',
  VIDEO_PROCESSING_FAILED: 'VIDEO_PROCESSING_FAILED',
  VIDEO_TAKE_SCREENSHOT_FAILED: 'VIDEO_TAKE_SCREENSHOT_FAILED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',

  // Video conversion specific errors
  CONVERSION_FAILED: 'VIDEO_CONVERSION_FAILED',
  CONVERSION_TIMEOUT: 'VIDEO_CONVERSION_TIMEOUT',
  INVALID_RESOLUTION: 'VIDEO_INVALID_RESOLUTION',
  INVALID_LENGTH: 'VIDEO_INVALID_LENGTH',

  // Video storage errors
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED',

  FIX_DURATION_ERROR: 'FIX_DURATION_ERROR',
  FIX_THUMBNAIL_ERROR: 'FIX_THUMBNAIL_ERROR',
} as const;

type HttpErrorCode = (typeof HTTP_ERRORS)[keyof typeof HTTP_ERRORS];
type DbErrorCode = (typeof DATABASE_ERRORS)[keyof typeof DATABASE_ERRORS];
type VideoErrorCode = (typeof VIDEO_ERRORS)[keyof typeof VIDEO_ERRORS];

type ErrorCode = HttpErrorCode | DbErrorCode | VideoErrorCode;

export { HTTP_ERRORS, DATABASE_ERRORS, VIDEO_ERRORS, HttpErrorCode, DbErrorCode, VideoErrorCode, ErrorCode };
