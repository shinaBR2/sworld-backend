import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitStore, MAX_REQUESTS } from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('should allow the first request', () => {
    expect(() => checkRateLimit('192.168.1.1', 'ext-id')).not.toThrow();
  });

  it('should allow requests up to the limit', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      expect(() => checkRateLimit('192.168.1.1', 'ext-id')).not.toThrow();
    }
  });

  it('should throw when rate limit is exceeded', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('192.168.1.1', 'ext-id');
    }

    expect(() => checkRateLimit('192.168.1.1', 'ext-id')).toThrow(
      'rate_limit_exceeded',
    );
  });

  it('should track different IPs separately', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('192.168.1.1', 'ext-id');
    }

    expect(() => checkRateLimit('192.168.2.1', 'ext-id')).not.toThrow();
  });

  it('should track different extension IDs separately', () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      checkRateLimit('192.168.1.1', 'ext-one');
    }

    expect(() => checkRateLimit('192.168.1.1', 'ext-two')).not.toThrow();
  });
});
