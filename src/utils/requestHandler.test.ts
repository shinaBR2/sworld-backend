import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReportVideoTaskFailure = vi.fn();
vi.mock('src/middleware/reportVideoFailure', () => ({
  reportVideoTaskFailure: (...args: unknown[]) =>
    mockReportVideoTaskFailure(...args),
}));

import { honoRequestHandler, type BusinessHandler } from './requestHandler';
import type { Context } from 'hono';

describe('requestHandler', () => {
  // Mock business handler that returns successful response
  const mockSuccessHandler: BusinessHandler = async (context) => {
    return {
      success: true,
      message: 'Success',
      dataObject: context.validatedData,
    };
  };

  // Mock business handler that throws an error
  const mockErrorHandler: BusinessHandler = async () => {
    throw new Error('Business logic error');
  };

  beforeEach(() => {
    mockReportVideoTaskFailure.mockReset();
  });

  describe('honoRequestHandler', () => {
    it('should handle successful requests', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ foo: 'bar' }),
        json: vi.fn(),
      } as unknown as Context;

      const handler = honoRequestHandler(mockSuccessHandler);
      await handler(mockContext);

      expect(mockContext.get).toHaveBeenCalledWith('validatedData');
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        dataObject: { foo: 'bar' },
      });
    });

    it('should pass validated data to business handler', async () => {
      const validatedData = { test: 'data' };
      const mockContext = {
        get: vi.fn().mockReturnValue(validatedData),
        json: vi.fn(),
      } as unknown as Context;

      const handler = honoRequestHandler(mockSuccessHandler);
      await handler(mockContext);

      expect(mockContext.get).toHaveBeenCalledWith('validatedData');
      expect(mockContext.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        dataObject: validatedData,
      });
    });

    it('should NOT report a video failure on success', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ foo: 'bar' }),
        json: vi.fn(),
      } as unknown as Context;

      await honoRequestHandler(mockSuccessHandler)(mockContext);

      expect(mockReportVideoTaskFailure).not.toHaveBeenCalled();
    });

    it('should let errors bubble up to middleware', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ foo: 'bar' }),
        json: vi.fn(),
      } as unknown as Context;

      const handler = honoRequestHandler(mockErrorHandler);
      await expect(handler(mockContext)).rejects.toThrow(
        'Business logic error',
      );
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should report the video failure before re-throwing on error', async () => {
      const mockContext = {
        get: vi.fn().mockReturnValue({ foo: 'bar' }),
        json: vi.fn(),
      } as unknown as Context;

      await expect(
        honoRequestHandler(mockErrorHandler)(mockContext),
      ).rejects.toThrow('Business logic error');

      expect(mockReportVideoTaskFailure).toHaveBeenCalledTimes(1);
      const [reportedError, reportedContext] =
        mockReportVideoTaskFailure.mock.calls[0];
      expect((reportedError as Error).message).toBe('Business logic error');
      expect(reportedContext).toBe(mockContext);
    });
  });
});
