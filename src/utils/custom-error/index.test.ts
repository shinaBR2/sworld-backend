import { describe, it, expect } from 'vitest';
import { CustomError, ERROR_SEVERITY } from './index';

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

describe('CustomError.from', () => {
  it('should return the same instance if error is already CustomError', () => {
    const originalError = new CustomError('test error', {
      errorCode: 'TEST_ERROR',
      severity: ERROR_SEVERITY.HIGH,
    });

    const result = CustomError.from(originalError, {
      message: 'new message',
      errorCode: 'NEW_ERROR',
    });

    expect(result).toBe(originalError); // Instance equality
  });

  it('should handle Error instance', () => {
    const error = new Error('test error');
    const result = CustomError.from(error, {
      errorCode: 'TEST_ERROR',
      severity: ERROR_SEVERITY.HIGH,
    });

    expect(result).toBeInstanceOf(CustomError);
    expect(result.message).toBe('test error');
    expect(result.errorCode).toBe('TEST_ERROR');
    expect(result.severity).toBe(ERROR_SEVERITY.HIGH);
    expect(result.originalError).toBe(error);
  });

  it('should use provided message over Error message', () => {
    const error = new Error('test error');
    const result = CustomError.from(error, {
      message: 'custom message',
      errorCode: 'TEST_ERROR',
    });

    expect(result.message).toBe('custom message');
  });

  it('should handle non-Error objects', () => {
    const error = { custom: 'error' };
    const result = CustomError.from(error);

    expect(result).toBeInstanceOf(CustomError);
    expect(result.message).toBe('[object Object]');
    expect(result.originalError).toBeInstanceOf(Error);
    expect(result.originalError?.message).toBe('[object Object]');
  });

  it('should handle primitive values', () => {
    const testCases = [
      { input: 42, expected: '42' },
      { input: 'error string', expected: 'error string' },
      { input: true, expected: 'true' },
      { input: null, expected: 'null' },
      { input: undefined, expected: 'undefined' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = CustomError.from(input);

      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe(expected);
      expect(result.originalError).toBeInstanceOf(Error);
      expect(result.originalError?.message).toBe(expected);
    });
  });

  it('should handle options with context', () => {
    const error = new Error('test error');
    const context = { requestId: '123', userId: '456' };

    const result = CustomError.from(error, {
      errorCode: 'TEST_ERROR',
      context,
    });

    expect(result.context).toEqual(expect.objectContaining(context));
  });

  it('should use default values when options are not provided', () => {
    const error = new Error('test error');
    const result = CustomError.from(error);

    expect(result.errorCode).toBe('UNKNOWN_ERROR');
    expect(result.severity).toBe(ERROR_SEVERITY.MEDIUM);
    expect(result.context).toEqual({
      originalErrorMessage: error.message,
      originalErrorStack: error.stack,
    });
  });
});
