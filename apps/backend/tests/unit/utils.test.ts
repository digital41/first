import { describe, it, expect } from 'vitest';
import { cleanObject, formatDateFr, sleep } from '../../src/utils/index.js';

describe('Utils', () => {
  describe('cleanObject', () => {
    it('should remove undefined values from object', () => {
      const input = {
        name: 'John',
        email: undefined,
        age: 25,
        phone: undefined,
      };

      const result = cleanObject(input);

      expect(result).toEqual({
        name: 'John',
        age: 25,
      });
    });

    it('should keep null values', () => {
      const input = {
        name: 'John',
        email: null,
      };

      const result = cleanObject(input);

      expect(result).toEqual({
        name: 'John',
        email: null,
      });
    });

    it('should handle empty object', () => {
      const result = cleanObject({});
      expect(result).toEqual({});
    });

    it('should keep falsy values except undefined', () => {
      const input = {
        zero: 0,
        empty: '',
        falsy: false,
        undef: undefined,
      };

      const result = cleanObject(input);

      expect(result).toEqual({
        zero: 0,
        empty: '',
        falsy: false,
      });
    });
  });

  describe('formatDateFr', () => {
    it('should format date in French format', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDateFr(date);

      // Result should contain French date elements
      expect(result).toContain('15');
      expect(result).toContain('janvier');
      expect(result).toContain('2024');
    });

    it('should include time in the format', () => {
      const date = new Date('2024-06-20T14:45:00');
      const result = formatDateFr(date);

      // Result should contain time
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('sleep', () => {
    it('should pause execution for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      // Allow some margin for timing variations
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
