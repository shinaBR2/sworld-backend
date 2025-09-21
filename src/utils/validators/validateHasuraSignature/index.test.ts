// test/validateHasuraSignature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateHasuraSignature } from './index';

// Mock dependencies
vi.mock('src/utils/logger', () => ({
  getCurrentLogger: vi.fn(() => ({
    info: vi.fn(),
  })),
}));

vi.mock('src/utils/schema', () => ({
  AppError: vi.fn((message, context) => ({
    success: false,
    message,
    ...context,
  })),
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
      json: vi.fn().mockResolvedValue({
        event: {
          metadata: { id: 'event-123' },
        },
      }),
    },
    json: vi.fn().mockReturnThis(),
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentLogger.mockReturnValue(mockLogger as any);
    mockContext.req.header.mockReturnValue('valid-signature');
  });

  it('should call next() when signature is valid', async () => {
    mockValidateSignature.mockReturnValue(true);
    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockValidateSignature).toHaveBeenCalledWith('valid-signature');
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockContext.json).not.toHaveBeenCalled();
  });

  it('should return error when signature header is missing', async () => {
    mockContext.req.header.mockReturnValue(undefined);
    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith({
      success: false,
      message: 'Missing signature header',
      eventId: 'event-123',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return error when signature is invalid', async () => {
    mockValidateSignature.mockReturnValue(false);
    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    expect(mockValidateSignature).toHaveBeenCalledWith('valid-signature');
    expect(mockLogger.info).toHaveBeenCalledWith({
      message: 'Invalid Hasura webhook signature',
      eventId: 'event-123',
    });
    expect(mockContext.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid webhook signature',
      eventId: 'event-123',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle missing event metadata', async () => {
    mockValidateSignature.mockReturnValue(true);
    mockContext.req.json.mockResolvedValueOnce({ event: {} });
    mockContext.req.header.mockReturnValue('valid-signature');

    const middleware = validateHasuraSignature();
    await middleware(mockContext as any, mockNext);

    // Should still call next since we're not validating the event structure here
    expect(mockNext).toHaveBeenCalled();
  });
});
