import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as hh3dModule from './hh3d';
import { getHandlerType, createRequestHandler } from './utils';

describe('Request Handler Utilities', () => {
  beforeEach(() => {
    vi.spyOn(hh3dModule, 'hh3dHandler').mockImplementation(_options => {
      return {
        handler: () => {},
        initialState: {},
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHandlerType', () => {
    it('should return "hh3d" for URLs containing hoathinh3d', () => {
      const urls = ['https://example.com/hoathinh3d/some-path'];
      expect(getHandlerType(urls)).toBe('hh3d');
    });

    it('should return empty string for unrecognized URLs', () => {
      const urls = ['https://example.com/other-site'];
      expect(getHandlerType(urls)).toBe('');
    });

    it('should return "hh3d" if any URL contains hoathinh3d', () => {
      const urls = ['https://example.com/other-site', 'https://example.com/hoathinh3d/some-path'];
      expect(getHandlerType(urls)).toBe('hh3d');
    });
  });

  describe('createRequestHandler', () => {
    const mockOptions = {
      startUrls: ['https://example.com/hoathinh3d'],
      maxConcurrency: 1,
    };

    it('should call hh3dHandler for "hh3d" handler type', () => {
      const mockHandlerResult = { handler: () => {}, initialState: {} };
      vi.spyOn(hh3dModule, 'hh3dHandler').mockReturnValue(mockHandlerResult);

      const result = createRequestHandler('hh3d', mockOptions);

      expect(hh3dModule.hh3dHandler).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe(mockHandlerResult);
    });

    it('should throw error for unsupported handler type', () => {
      expect(() => createRequestHandler('unsupported', mockOptions)).toThrow('Unsupported handler type: unsupported');
    });
  });
});
