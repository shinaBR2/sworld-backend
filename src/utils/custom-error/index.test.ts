import { describe, it, expect } from 'vitest';
import { CustomError } from './index';

describe('CustomError', () => {
  it('should create an error with default values', () => {
    const error = new CustomError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('CustomError');
    expect(error.errorCode).toBe('UNKNOWN_ERROR');
    expect(error.severity).toBe('medium');
    expect(error.context).toEqual({});
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CustomError);
  });

  it('should create an error with custom options', () => {
    const originalError = new Error('Original error');
    const context = { userId: 123 };

    const error = new CustomError('Specific error', {
      errorCode: 'USER_ERROR',
      severity: 'high',
      context,
      originalError,
    });

    expect(error.message).toBe('Specific error');
    expect(error.errorCode).toBe('USER_ERROR');
    expect(error.severity).toBe('high');
    expect(error.context).toEqual({
      userId: 123,
      originalErrorMessage: 'Original error',
      originalErrorStack: originalError.stack,
    });
    expect(error.originalError).toBe(originalError);
  });

  it('should preserve stack trace', () => {
    const error = new CustomError('Stack trace test');

    expect(error.stack).toBeDefined();
    expect(error.stack).toMatch(/index\.test\.ts/);
  });

  it('should have a timestamp', () => {
    const error = new CustomError('Timestamp test');

    expect(error.timestamp).toBeTypeOf('number');
    expect(error.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should handle errors without original error', () => {
    const error = new CustomError('No original error', {
      errorCode: 'TEST_CODE',
      severity: 'low',
    });

    expect(error.errorCode).toBe('TEST_CODE');
    expect(error.severity).toBe('low');
    expect(error.originalError).toBeUndefined();
  });

  it('should work with instanceof checks', () => {
    const error = new CustomError('Instance check');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof CustomError).toBe(true);
  });
});
