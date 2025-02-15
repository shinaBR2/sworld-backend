import { describe, it, expect } from 'vitest';
import { fixVideosDurationSchema } from './schema';
import { ZodError } from 'zod';

describe('fixVideosDurationSchema', () => {
  const validRequest = {
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': 'test-signature',
      'some-other-header': 'value', // Testing passthrough
    },
  };

  it('should successfully transform valid request', () => {
    const result = fixVideosDurationSchema.parse(validRequest);

    expect(result).toEqual({
      contentTypeHeader: 'application/json',
      signatureHeader: 'test-signature',
    });
  });

  it('should allow additional headers due to passthrough', () => {
    const requestWithExtraHeaders = {
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': 'test-signature',
        'extra-header': 'some-value',
        'another-header': 'another-value',
      },
    };

    const result = fixVideosDurationSchema.parse(requestWithExtraHeaders);

    expect(result).toEqual({
      contentTypeHeader: 'application/json',
      signatureHeader: 'test-signature',
    });
  });

  it('should fail when content-type header is missing', () => {
    const requestWithoutContentType = {
      headers: {
        'x-webhook-signature': 'test-signature',
      },
    };

    expect(() => fixVideosDurationSchema.parse(requestWithoutContentType)).toThrow(ZodError);
  });

  it('should fail when x-webhook-signature header is missing', () => {
    const requestWithoutSignature = {
      headers: {
        'content-type': 'application/json',
      },
    };

    expect(() => fixVideosDurationSchema.parse(requestWithoutSignature)).toThrow(ZodError);
  });

  it('should fail when headers property is missing', () => {
    const requestWithoutHeaders = {};

    expect(() => fixVideosDurationSchema.parse(requestWithoutHeaders)).toThrow(ZodError);
  });

  it('should handle null or undefined values appropriately', () => {
    const requestWithNullValues = {
      headers: {
        'content-type': null,
        'x-webhook-signature': undefined,
      },
    };

    expect(() => fixVideosDurationSchema.parse(requestWithNullValues)).toThrow(ZodError);
  });

  it('should fail when headers is null', () => {
    const requestWithNullHeaders = {
      headers: null,
    };

    expect(() => fixVideosDurationSchema.parse(requestWithNullHeaders)).toThrow(ZodError);
  });

  it('should validate transformed output types', () => {
    const result = fixVideosDurationSchema.parse(validRequest);

    expect(typeof result.contentTypeHeader).toBe('string');
    expect(typeof result.signatureHeader).toBe('string');
  });
});
