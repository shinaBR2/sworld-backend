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
  originalError?: Error;
  contexts?: ErrorContext[];
}

interface ErrorContext {
  source: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

const prepareContexts = (context: Record<string, unknown>, source: string, originalError?: Error) => {
  const contexts: ErrorContext[] = [];

  // Add current layer's context first
  contexts.push({
    source,
    data: context,
    timestamp: Date.now(),
  });

  // Add original error details if it's a native Error
  if (!(originalError instanceof CustomError)) {
    // Only add original error context for new errors
    if (originalError) {
      contexts.push({
        source: 'OriginalError',
        data: {
          message: originalError.message,
          name: originalError.name,
          stack: originalError.stack,
        },
        timestamp: Date.now(),
      });
    }
  }

  return contexts;
};

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
      severity = 'medium',
      context = {},
      source = 'Unknown',
      originalError,
      contexts: existingContexts = [],
    } = options;

    this.name = 'CustomError';
    this.timestamp = Date.now();
    this.errorCode = errorCode;
    this.severity = severity;

    // Start with existing contexts
    this.contexts = [...existingContexts];

    // Add current context if source and context are provided
    // if (Object.keys(context).length > 0) {
    this.contexts.unshift({
      source,
      data: context,
      timestamp: Date.now(),
    });
    // }

    // Only add original error context if it's not a CustomError and hasn't been added yet
    if (originalError && !(originalError instanceof CustomError)) {
      const hasOriginalErrorContext = this.contexts.some(ctx => ctx.source === 'OriginalError');

      if (!hasOriginalErrorContext) {
        this.contexts.push({
          source: 'OriginalError',
          data: {
            message: originalError.message,
            name: originalError.name,
            stack: originalError.stack,
          },
          timestamp: Date.now(),
        });
      }
    }

    this.originalError = originalError;

    if (originalError) {
      this.stack = originalError.stack;
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

  // Method to flatten contexts for easy logging/debugging
  getFlattenedContext(): Record<string, unknown> {
    return this.contexts.reduce((acc, context) => {
      return {
        ...acc,
        [`${context.source}_${context.timestamp}`]: context.data,
      };
    }, {});
  }

  static from(error: unknown, options: Omit<ErrorOptions, 'originalError'> & { message?: string } = {}): CustomError {
    if (error instanceof CustomError) {
      return new CustomError(options.message || error.message, {
        errorCode: options.errorCode || error.errorCode,
        severity: options.severity || error.severity,
        originalError: error.originalError,
        source: options.source,
        context: options.context || {},
        contexts: error.contexts,
      });
    }

    if (error instanceof Error) {
      // const originalErrorContext = {
      //   source: 'OriginalError',
      //   data: {
      //     message: error.message,
      //     name: error.name,
      //     stack: error.stack,
      //   },
      //   timestamp: Date.now(),
      // };

      return new CustomError(options.message || error.message, {
        ...options,
        originalError: error,
        // context: originalErrorContext,
        // contexts: [originalErrorContext], // Only add OriginalError context here
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
