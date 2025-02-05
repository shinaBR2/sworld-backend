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
  source?: string;
  originalError?: Error | CustomError;
}

interface ErrorContext {
  source: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

class CustomError extends Error {
  public readonly timestamp: number;
  public readonly errorCode: string;
  public readonly severity: ErrorSeverity;
  public readonly contexts: ErrorContext[];
  public readonly originalError?: Error;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);

    const {
      errorCode = 'UNKNOWN_ERROR',
      severity = ERROR_SEVERITY.MEDIUM,
      context = {},
      source = 'Unknown',
      originalError,
    } = options;

    this.name = 'CustomError';
    this.timestamp = Date.now();
    this.errorCode = errorCode;
    this.severity = severity;
    this.contexts = [];

    // If wrapping a CustomError
    if (originalError instanceof CustomError) {
      this.contexts = [
        {
          source,
          data: context,
          timestamp: Date.now(),
        },
        ...originalError.contexts,
      ];
      this.originalError = originalError.originalError;
      if (originalError.stack) {
        this.stack = originalError.stack;
      }
    }
    // If wrapping a regular Error
    else if (originalError instanceof Error) {
      this.contexts = [
        {
          source,
          data: context,
          timestamp: Date.now(),
        },
        {
          source: 'OriginalError',
          data: {
            message: originalError.message,
            name: originalError.name,
            stack: originalError.stack,
          },
          timestamp: Date.now(),
        },
      ];
      this.originalError = originalError;
      if (originalError.stack) {
        this.stack = originalError.stack;
      }
    }
    // Basic error case
    else {
      this.contexts = [
        {
          source,
          data: context,
          timestamp: Date.now(),
        },
      ];
    }
  }

  static low(message: string, options: Omit<ErrorOptions, 'severity'> = {}): CustomError {
    return new CustomError(message, {
      ...options,
      severity: ERROR_SEVERITY.LOW,
    });
  }

  static medium(message: string, options: Omit<ErrorOptions, 'severity'> = {}): CustomError {
    return new CustomError(message, {
      ...options,
      severity: ERROR_SEVERITY.MEDIUM,
    });
  }

  static high(message: string, options: Omit<ErrorOptions, 'severity'> = {}): CustomError {
    return new CustomError(message, {
      ...options,
      severity: ERROR_SEVERITY.HIGH,
    });
  }

  static critical(message: string, options: Omit<ErrorOptions, 'severity'> = {}): CustomError {
    return new CustomError(message, {
      ...options,
      severity: ERROR_SEVERITY.CRITICAL,
    });
  }

  getFlattenedContext(): Record<string, unknown> {
    return this.contexts.reduce(
      (acc, context) => ({
        ...acc,
        [`${context.source}_${context.timestamp}`]: context.data,
      }),
      {}
    );
  }
}

export { ERROR_SEVERITY, CustomError };
