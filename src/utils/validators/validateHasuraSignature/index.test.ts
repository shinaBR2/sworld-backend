// test/validateHasuraSignature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateHasuraSignature } from './index';
import { CustomError } from 'src/utils/custom-error';

// Mock dependencies
vi.mock('src/utils/custom-error');
vi.mock('src/utils/error-codes', () => ({
  VALIDATION_ERRORS: {
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  },
}));
vi.mock('src/utils/logger', () => ({
  getCurrentLogger: vi.fn(() => ({
    info: vi.fn(),
  })),
}));
vi.mock('src/utils/schema', () => ({
  AppError: vi.fn((message, context) => ({ error: message, ...context })),
}));
vi.mock('./validator', () => ({
  validateSignature: vi.fn(),
}));

describe('validateHasuraSignature', async () => {
  const { validateSignature } = await import('./validator');
  const { getCurrentLogger } = await import('src/utils/logger');
  const { AppError } = await import('src/utils/schema');

  const mockValidateSignature = vi.mocked(validateSignature);
  const mockLogger = { info: vi.fn() };
  const mockGetCurrentLogger = vi.mocked(getCurrentLogger);
  const mockAppError = vi.mocked(AppError);

  const mockContext = {
    req: {
      header: vi.fn(),
      json: vi.fn(),
    },
    json: vi.fn(),
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentLogger.mockReturnValue(mockLogger as any);
    mockContext.req.header.mockReturnValue('test-signature');
    mockContext.req.json.mockResolvedValue({
      event: {
        metadata: {
          id: 'event-123',
        },
      },
    });
  });

  it('should call next() when signature is valid', async () => {
    mockValidateSignature.mockReturnValue(true);

    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockValidateSignature).toHaveBeenCalledWith('test-signature');
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockContext.json).not.toHaveBeenCalled();
  });

  it('should throw CustomError when signature header is missing', async () => {
    mockContext.req.header.mockReturnValue(undefined);

    const middleware = validateHasuraSignature();

    await expect(middleware(mockContext as any, mockNext)).rejects.toThrow();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return error response when signature is invalid', async () => {
    mockValidateSignature.mockReturnValue(false);
    mockAppError.mockReturnValue({
      error: 'Invalid webhook signature',
      eventId: 'event-123',
    });

    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockValidateSignature).toHaveBeenCalledWith('test-signature');
    expect(mockLogger.info).toHaveBeenCalledWith({
      message: 'Invalid Hasura webhook signature',
      eventId: 'event-123',
    });
    expect(mockContext.json).toHaveBeenCalledWith({
      error: 'Invalid webhook signature',
      eventId: 'event-123',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should re-throw CustomError instances', async () => {
    const customError = new Error('Test custom error');
    mockContext.req.json.mockRejectedValue(customError);

    const middleware = validateHasuraSignature();

    await expect(middleware(mockContext as any, mockNext)).rejects.toThrow(
      'Test custom error',
    );
  });

  it('should wrap non-CustomError instances', async () => {
    const regularError = new Error('JSON parse error');
    mockContext.req.json.mockRejectedValue(regularError);

    const middleware = validateHasuraSignature();

    await expect(middleware(mockContext as any, mockNext)).rejects.toThrow();
  });

  it('should handle missing event metadata gracefully', async () => {
    mockContext.req.json.mockResolvedValue({
      event: {}, // missing metadata
    });
    mockValidateSignature.mockReturnValue(false);

    const middleware = validateHasuraSignature();

    await expect(middleware(mockContext as any, mockNext)).rejects.toThrow();
  });

  it('should log with correct event ID when signature is invalid', async () => {
    const eventId = 'test-event-456';
    mockContext.req.json.mockResolvedValue({
      event: {
        metadata: {
          id: eventId,
        },
      },
    });
    mockValidateSignature.mockReturnValue(false);

    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockLogger.info).toHaveBeenCalledWith({
      message: 'Invalid Hasura webhook signature',
      eventId: eventId,
    });
  });
});
