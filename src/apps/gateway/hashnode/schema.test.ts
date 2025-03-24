import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { webhookSchema } from './schema';

describe('webhookSchema', () => {
  const validRequest = {
    headers: {
      'content-type': 'application/json',
      'x-hashnode-signature': 'test-signature',
      'some-other-header': 'value',
    },
  };

  it('should successfully transform valid request', () => {
    const result = webhookSchema.parse(validRequest);

    expect(result).toEqual({
      contentTypeHeader: 'application/json',
      signatureHeader: 'test-signature',
    });
  });

  it('should allow additional headers due to passthrough', () => {
    const requestWithExtraHeaders = {
      headers: {
        'content-type': 'application/json',
        'x-hashnode-signature': 'test-signature',
        'extra-header': 'some-value',
        'another-header': 'another-value',
      },
    };

    const result = webhookSchema.parse(requestWithExtraHeaders);

    expect(result).toEqual({
      contentTypeHeader: 'application/json',
      signatureHeader: 'test-signature',
    });
  });

  it('should fail when content-type header is missing', () => {
    const requestWithoutContentType = {
      headers: {
        'x-hashnode-signature': 'test-signature',
      },
    };

    expect(() => webhookSchema.parse(requestWithoutContentType)).toThrow(ZodError);
  });

  it('should fail when x-hashnode-signature header is missing', () => {
    const requestWithoutSignature = {
      headers: {
        'content-type': 'application/json',
      },
    };

    expect(() => webhookSchema.parse(requestWithoutSignature)).toThrow(ZodError);
  });

  it('should fail when headers property is missing', () => {
    const requestWithoutHeaders = {};

    expect(() => webhookSchema.parse(requestWithoutHeaders)).toThrow(ZodError);
  });

  it('should handle null or undefined values appropriately', () => {
    const requestWithNullValues = {
      headers: {
        'content-type': null,
        'x-hashnode-signature': undefined,
      },
    };

    expect(() => webhookSchema.parse(requestWithNullValues)).toThrow(ZodError);
  });

  it('should fail when headers is null', () => {
    const requestWithNullHeaders = {
      headers: null,
    };

    expect(() => webhookSchema.parse(requestWithNullHeaders)).toThrow(ZodError);
  });

  it('should validate transformed output types', () => {
    const result = webhookSchema.parse(validRequest);

    expect(typeof result.contentTypeHeader).toBe('string');
    expect(typeof result.signatureHeader).toBe('string');
  });

  it('should fail when content-type is not application/json', () => {
    const invalidContentType = {
      headers: {
        'content-type': 'text/plain',
        'x-hashnode-signature': 'test-signature',
      },
    };

    expect(() => webhookSchema.parse(invalidContentType)).toThrow(ZodError);
  });
});
