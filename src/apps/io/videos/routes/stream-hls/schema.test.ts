import { describe, it, expect } from 'vitest';
import { StreamHandlerSchema } from './schema';

describe('StreamHandlerSchema', () => {
  const validHeaders = {
    'content-type': 'application/json',
    'x-task-id': '223e4567-e89b-12d3-a456-426614174001',
  };

  it('should reject request with missing content-type headers', () => {
    const invalidRequest = {
      body: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: {
        'content-type': 'application/json',
      },
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject request with missing x-task-id headers', () => {
    const invalidRequest = {
      body: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: {
        'x-task-id': '223e4567-e89b-12d3-a456-426614174001',
      },
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject request with missing required fields', () => {
    const invalidRequest = {
      body: {
        data: {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject empty string values', () => {
    const invalidRequest = {
      body: {
        data: {
          id: '',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should validate correct request structure', () => {
    const validRequest = {
      body: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(validRequest);
    console.log('Actual headers received:', validRequest.headers);
    console.log(result.error);
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID id', () => {
    const invalidRequest = {
      body: {
        data: {
          id: 'invalid-id',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject non-HTTPS video URL', () => {
    const invalidRequest = {
      body: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'http://storage.example.com/video.mp4',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject non-video file URL', () => {
    const invalidRequest = {
      body: {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          videoUrl: 'https://storage.example.com/image.jpg',
        },
        metadata: {
          id: 'event-789',
          spanId: 'span-abc',
          traceId: 'trace-def',
        },
      },
      headers: validHeaders,
    };

    const result = StreamHandlerSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});
