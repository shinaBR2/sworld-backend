import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validateRequest } from './validator';

describe('validateRequest', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {},
      query: {},
      body: {},
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should call next() when validation passes', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
        age: z.number(),
      }),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.body = {
      name: 'John',
      age: 25,
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should set validatedData on request when validation passes', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.body = {
      name: 'John',
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq).toHaveProperty('validatedData');
    expect((mockReq as any).validatedData).toEqual({
      body: { name: 'John' },
      params: {},
      query: {},
      headers: {},
    });
  });

  it('should handle array path errors', () => {
    const schema = z.object({
      body: z.object({
        items: z.array(
          z.object({
            id: z.string(),
            value: z.number(),
          })
        ),
      }),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.body = {
      items: [
        { id: '1', value: 'invalid' }, // invalid value type at index 0
      ],
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('body items [0] value'),
      dataObject: null,
    });
  });

  it('should handle required field errors', () => {
    const schema = z.object({
      body: z.object({
        requiredField: z.string(),
      }),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.body = {};

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('body requiredField is required'),
      dataObject: null,
    });
  });

  it('should handle multiple validation errors', () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.body = {
      email: 'invalid-email',
      age: 15,
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('Invalid input:'),
      dataObject: null,
    });
    const errorMessage = mockRes.json.mock.calls[0][0].message;
    expect(errorMessage).toMatch(/email/);
    expect(errorMessage).toMatch(/18/);
  });

  it('should handle header validation path', () => {
    const schema = z.object({
      body: z.object({}),
      params: z.object({}),
      query: z.object({}),
      headers: z.object({
        required: z.string(),
      }),
    });

    mockReq.headers = {};

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('Header required is required'),
      dataObject: null,
    });
  });

  it('should validate query parameters', () => {
    const schema = z.object({
      body: z.object({}),
      params: z.object({}),
      query: z.object({
        page: z.string().regex(/^\d+$/),
      }),
      headers: z.object({}),
    });

    mockReq.query = {
      page: 'abc',
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('Invalid input:'),
      dataObject: null,
    });
  });

  it('should validate URL parameters', () => {
    const schema = z.object({
      body: z.object({}),
      params: z.object({
        id: z.string().uuid(),
      }),
      query: z.object({}),
      headers: z.object({}),
    });

    mockReq.params = {
      id: 'invalid-uuid',
    };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('Invalid input:'),
      dataObject: null,
    });
  });
});
