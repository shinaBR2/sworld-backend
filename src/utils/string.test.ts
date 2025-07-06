import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateSecureCode, generateHumanCode } from './string';

// Mock the crypto module
vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockImplementation(size => {
    // Return a buffer with 'a' repeated 'size' times
    return Buffer.alloc(size, 'a');
  }),
}));

describe('string utilities', () => {
  describe('generateSecureCode', () => {
    it('should generate a base64url string of correct length', () => {
      const length = 16;
      const result = generateSecureCode(length);

      // Should be a base64url string
      expect(result).toMatch(/^[a-zA-Z0-9_-]+$/);

      // For our mock, it will be 16 'a's encoded in base64url
      expect(result).toBe('YWFhYWFhYWFhYWFhYWFhYQ');
      expect(result.length).toBe(22); // 16 bytes in base64 is 22 chars
    });

    it('should handle different length inputs', () => {
      const testCases = [8, 16, 32];

      testCases.forEach(length => {
        const result = generateSecureCode(length);
        // Should be a base64url string
        expect(result).toMatch(/^[a-zA-Z0-9_-]+$/);
      });
    });
  });

  describe('generateHumanCode', () => {
    const mockWords = ['BIRD', 'TREE', 'BLUE', 'MOON', 'STAR', 'WIND'] as const;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate a code with a word and a 3-digit number', () => {
      // Mock Math.random to return 0.5
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = generateHumanCode();

      // Should be in format "WORD-###"
      expect(result).toMatch(/^[A-Z]{4}-\d{3}$/);

      // With random=0.5, wordIndex = 3 (MOON), number = 499
      const word = result.split('-')[0];
      const number = parseInt(result.split('-')[1], 10);
      expect(mockWords).toContain(word);
      expect(number).toBeGreaterThanOrEqual(0);
      expect(number).toBeLessThan(1000);
    });

    it('should pad single-digit numbers with leading zeros', () => {
      // Mock Math.random to return a very small number
      vi.spyOn(Math, 'random').mockReturnValue(0.0001);

      const result = generateHumanCode();
      expect(result).toMatch(/^[A-Z]{4}-000$/);
    });

    it('should use different words from the word list', () => {
      // Test with different random values to get different words
      const testCases = [
        { random: 0.0, expectedWord: 'BIRD' },
        { random: 0.2, expectedWord: 'TREE' },
        { random: 0.4, expectedWord: 'BLUE' },
        { random: 0.6, expectedWord: 'MOON' },
        { random: 0.8, expectedWord: 'STAR' },
        { random: 0.999, expectedWord: 'WIND' },
      ];

      testCases.forEach(({ random, expectedWord }) => {
        vi.spyOn(Math, 'random').mockReturnValue(random);
        const result = generateHumanCode();
        expect(result.startsWith(expectedWord)).toBe(true);
      });
    });

    it('should always return a valid format', () => {
      // Test multiple times with different random values
      for (let i = 0; i < 10; i++) {
        const random = i / 10; // 0.0, 0.1, 0.2, ..., 0.9
        vi.spyOn(Math, 'random').mockReturnValue(random);
        const result = generateHumanCode();

        // Check format
        expect(result).toMatch(/^[A-Z]{4}-\d{3}$/);

        // Verify the word is from our predefined list
        const word = result.split('-')[0];
        expect(mockWords).toContain(word);

        // Verify the number is between 000-999
        const number = parseInt(result.split('-')[1], 10);
        expect(number).toBeGreaterThanOrEqual(0);
        expect(number).toBeLessThan(1000);
      }
    });
  });
});
