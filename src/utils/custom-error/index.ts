type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
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
}

export { CustomError };
