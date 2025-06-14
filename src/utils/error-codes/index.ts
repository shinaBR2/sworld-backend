const HTTP_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
};

const VALIDATION_ERRORS = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
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

  SHARE_FAILED: 'SHARE_FAILED',
} as const;

const CRAWL_ERRORS = {
  UNSUPPORTED_SITE: 'UNSUPPORTED_SITE',
  MISSING_URL_SELECTOR: 'MISSING_URL_SELECTOR',
  INVALID_JSON: 'INVALID_JSON',
};

type HttpErrorCode = (typeof HTTP_ERRORS)[keyof typeof HTTP_ERRORS];
type ValidationCode = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS];
type DbErrorCode = (typeof DATABASE_ERRORS)[keyof typeof DATABASE_ERRORS];
type VideoErrorCode = (typeof VIDEO_ERRORS)[keyof typeof VIDEO_ERRORS];
type CrawlErrorCode = (typeof CRAWL_ERRORS)[keyof typeof CRAWL_ERRORS];

type ErrorCode = HttpErrorCode | ValidationCode | DbErrorCode | VideoErrorCode | CrawlErrorCode;

export {
  CRAWL_ERRORS,
  DATABASE_ERRORS,
  DbErrorCode,
  ErrorCode,
  HTTP_ERRORS,
  HttpErrorCode,
  VALIDATION_ERRORS,
  VIDEO_ERRORS,
  VideoErrorCode,
};
