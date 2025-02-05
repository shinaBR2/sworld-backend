const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

type ErrorSeverity = (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY];
interface ErrorOptions {
  errorCode?: string;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: Error;
}

class CustomError extends Error {
  public readonly timestamp: number;
  public readonly errorCode: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly context: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    { errorCode = 'UNKNOWN_ERROR', severity = 'medium', context = {}, originalError }: ErrorOptions = {}
  ) {
    super(message);

    this.name = 'CustomError';
    this.timestamp = Date.now();
    this.errorCode = errorCode;
    this.severity = severity;
    this.context = {
      ...context,
      originalErrorMessage: originalError?.message,
      originalErrorStack: originalError?.stack,
    };
    this.originalError = originalError;
  }

  static from(error: unknown, options: Omit<ErrorOptions, 'originalError'> & { message?: string } = {}): CustomError {
    if (error instanceof CustomError) {
      return error;
    }

    if (error instanceof Error) {
      return new CustomError(options.message || error.message, {
        ...options,
        originalError: error,
      });
    }

    // Handle everything else
    const errorMessage = options.message || String(error);
    return new CustomError(errorMessage, {
      ...options,
      originalError: new Error(errorMessage),
    });
  }
}

export { ERROR_SEVERITY, CustomError };
