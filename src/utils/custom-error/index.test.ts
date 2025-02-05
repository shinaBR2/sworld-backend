import { describe, it, expect } from 'vitest';
import { CustomError, ERROR_SEVERITY } from './index';

describe('CustomError', () => {
  it('should create an error with default values', () => {
    const error = new CustomError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('CustomError');
    expect(error.errorCode).toBe('UNKNOWN_ERROR');
    expect(error.severity).toBe('medium');
    expect(error.contexts).toHaveLength(1);
    expect(error.contexts[0].source).toBe('Unknown');
    expect(error.timestamp).toBeDefined();
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
      source: 'UserService',
      originalError,
    });

    expect(error.message).toBe('Specific error');
    expect(error.errorCode).toBe('USER_ERROR');
    expect(error.severity).toBe('high');
    expect(error.contexts).toHaveLength(2);
    expect(error.contexts[0].source).toBe('UserService');
    expect(error.contexts[0].data).toEqual({ userId: 123 });
    expect(error.contexts[1].source).toBe('OriginalError');
    expect(error.originalError).toBe(originalError);
  });

  it('should preserve original error stack trace', () => {
    const originalError = new Error('Original error');
    const error = new CustomError('Stack trace test', { originalError });

    expect(error.stack).toBe(originalError.stack);
  });

  it('should have a timestamp', () => {
    const error = new CustomError('Timestamp test');

    expect(error.timestamp).toBeTypeOf('number');
    expect(error.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should work with instanceof checks', () => {
    const error = new CustomError('Instance check');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof CustomError).toBe(true);
  });

  describe('Static severity methods', () => {
    it('should create errors with different severity levels', () => {
      const lowError = CustomError.low('Low severity');
      const mediumError = CustomError.medium('Medium severity');
      const highError = CustomError.high('High severity');
      const criticalError = CustomError.critical('Critical severity');

      expect(lowError.severity).toBe(ERROR_SEVERITY.LOW);
      expect(mediumError.severity).toBe(ERROR_SEVERITY.MEDIUM);
      expect(highError.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(criticalError.severity).toBe(ERROR_SEVERITY.CRITICAL);
    });
  });

  describe('getFlattenedContext', () => {
    it('should flatten contexts correctly', () => {
      const error = new CustomError('Flattened context test', {
        context: { userId: 123 },
        source: 'TestSource',
      });

      const flattenedContext = error.getFlattenedContext();
      const contextKeys = Object.keys(flattenedContext);

      expect(contextKeys).toHaveLength(1);
      expect(contextKeys[0]).toMatch(/^TestSource_\d+$/);
      expect(flattenedContext[contextKeys[0]]).toEqual({ userId: 123 });
    });

    it('should handle multiple contexts', () => {
      const originalError = new Error('Original error');
      const error = new CustomError('Multiple contexts', {
        context: { userId: 123 },
        source: 'UserService',
        originalError,
      });

      const flattenedContext = error.getFlattenedContext();
      const contextKeys = Object.keys(flattenedContext);

      expect(contextKeys).toHaveLength(2);
      expect(contextKeys[0]).toMatch(/^UserService_\d+$/);
      expect(contextKeys[1]).toMatch(/^OriginalError_\d+$/);
    });
  });

  describe('CustomError.from', () => {
    it('should create a new CustomError instance with preserved and merged contexts', () => {
      const originalError = new CustomError('test error', {
        errorCode: 'TEST_ERROR',
        severity: ERROR_SEVERITY.HIGH,
        context: { originalSource: 'InitialSource' },
        source: 'InitialSource',
      });

      const result = CustomError.from(originalError, {
        message: 'new message',
        errorCode: 'NEW_ERROR',
        context: { additionalContext: 'NewContext' },
        source: 'NewSource',
      });

      // Verify new instance is created
      expect(result).not.toBe(originalError);

      // Check new message and error code
      expect(result.message).toBe('new message');
      expect(result.errorCode).toBe('NEW_ERROR');

      // Check contexts
      expect(result.contexts).toHaveLength(2);

      expect(result.contexts[0].source).toBe('NewSource');
      expect(result.contexts[0].data).toEqual({
        additionalContext: 'NewContext',
      });
      expect(result.contexts[1].source).toBe('InitialSource');
      expect(result.contexts[1].data).toEqual({
        originalSource: 'InitialSource',
      });

      // Original error's originalError should be preserved
      expect(result.originalError).toBe(originalError.originalError);
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

      expect(result.contexts[0].data).toEqual(expect.objectContaining(context));
    });

    it('should use default values when options are not provided', () => {
      const error = new Error('test error');
      const result = CustomError.from(error);

      expect(result.errorCode).toBe('UNKNOWN_ERROR');
      expect(result.severity).toBe(ERROR_SEVERITY.MEDIUM);

      expect(result.contexts[1]).toEqual(
        expect.objectContaining({
          source: 'OriginalError',
          data: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        })
      );
    });
  });

  describe('CustomError Propagation', () => {
    // Simulate a low-level service function that might throw an error
    const lowLevelOperation = () => {
      throw new Error('Database connection failed');
    };

    // Simulate a mid-level service function that wraps and transforms errors
    const midLevelService = () => {
      try {
        lowLevelOperation();
      } catch (error) {
        const midError = CustomError.from(error, {
          message: 'Failed to perform database operation',
          errorCode: 'DB_OPERATION_FAILED',
          severity: ERROR_SEVERITY.HIGH,
          context: {
            service: 'UserService',
            method: 'createUser',
          },
          source: 'DatabaseLayer',
        });
        throw midError;
      }
    };

    // Simulate a high-level function that further wraps errors
    const highLevelController = () => {
      try {
        midLevelService();
      } catch (error) {
        const highError = CustomError.from(error, {
          message: 'User creation failed',
          errorCode: 'USER_CREATION_FAILED',
          severity: ERROR_SEVERITY.CRITICAL,
          context: {
            userId: '123',
            requestId: 'req-456',
          },
          source: 'UserController',
        });
        throw highError;
      }
    };

    it('should propagate errors through multiple layers without circular references', () => {
      try {
        highLevelController();
      } catch (error) {
        // Verify it's a CustomError
        expect(error).toBeInstanceOf(CustomError);

        // Check the top-level error properties
        expect(error.message).toBe('User creation failed');
        expect(error.errorCode).toBe('USER_CREATION_FAILED');
        expect(error.severity).toBe(ERROR_SEVERITY.CRITICAL);

        // Verify contexts
        expect(error.contexts).toHaveLength(3); // High-level, Mid-level, Original error

        // Check context details
        const [controllerContext, databaseContext, originalErrorContext] = error.contexts;

        // High-level context
        expect(controllerContext.source).toBe('UserController');
        expect(controllerContext.data).toEqual({
          userId: '123',
          requestId: 'req-456',
        });

        // Mid-level context
        expect(databaseContext.source).toBe('DatabaseLayer');
        expect(databaseContext.data).toEqual({
          service: 'UserService',
          method: 'createUser',
        });

        // Original error context
        expect(originalErrorContext.source).toBe('OriginalError');
        expect(originalErrorContext.data.message).toBe('Database connection failed');

        // Verify no circular reference
        expect(error.originalError).not.toBeInstanceOf(CustomError);
        expect(error.originalError).toBeInstanceOf(Error);
      }
    });
  });
});
