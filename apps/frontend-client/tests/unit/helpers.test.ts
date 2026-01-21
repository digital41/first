import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatFileSize,
  truncate,
  capitalize,
  formatTicketNumber,
  formatOrderNumber,
  cn,
  getInitials,
  isValidEmail,
  isValidPhone,
  getSLATimeRemaining,
} from '@/utils/helpers';

describe('Helper Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('truncate', () => {
    it('should truncate string longer than limit', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate string shorter than limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
      expect(capitalize('tEST')).toBe('Test');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('formatTicketNumber', () => {
    it('should format ticket number with leading zeros', () => {
      expect(formatTicketNumber(1)).toBe('SAV-00001');
      expect(formatTicketNumber(123)).toBe('SAV-00123');
      expect(formatTicketNumber(99999)).toBe('SAV-99999');
    });

    it('should handle string input', () => {
      expect(formatTicketNumber('42')).toBe('SAV-00042');
    });
  });

  describe('formatOrderNumber', () => {
    it('should prepend CMD- prefix', () => {
      expect(formatOrderNumber('2024-001')).toBe('CMD-2024-001');
      expect(formatOrderNumber('BC123')).toBe('CMD-BC123');
    });
  });

  describe('cn (classNames)', () => {
    it('should join class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should filter out falsy values', () => {
      expect(cn('foo', false, 'bar', null, undefined, '')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active');
    });
  });

  describe('getInitials', () => {
    it('should return initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane Marie Smith')).toBe('JM');
    });

    it('should return max 2 characters', () => {
      expect(getInitials('Alpha Beta Gamma Delta')).toBe('AB');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should return uppercase', () => {
      expect(getInitials('john doe')).toBe('JD');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate French phone numbers', () => {
      expect(isValidPhone('0612345678')).toBe(true);
      expect(isValidPhone('06 12 34 56 78')).toBe(true);
      expect(isValidPhone('06.12.34.56.78')).toBe(true);
      expect(isValidPhone('+33612345678')).toBe(true);
      expect(isValidPhone('+33 6 12 34 56 78')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('getSLATimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate time remaining correctly', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      vi.setSystemTime(now);

      const deadline = new Date('2024-01-15T14:30:00Z'); // 4h30 later
      const result = getSLATimeRemaining(deadline);

      expect(result.hours).toBe(4);
      expect(result.minutes).toBe(30);
      expect(result.isOverdue).toBe(false);
    });

    it('should detect overdue status', () => {
      const now = new Date('2024-01-15T14:00:00Z');
      vi.setSystemTime(now);

      const deadline = new Date('2024-01-15T10:00:00Z'); // 4h earlier
      const result = getSLATimeRemaining(deadline);

      expect(result.isOverdue).toBe(true);
      expect(result.percentage).toBe(100);
    });

    it('should handle string date input', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      vi.setSystemTime(now);

      const result = getSLATimeRemaining('2024-01-15T12:00:00Z');

      expect(result.hours).toBe(2);
      expect(result.isOverdue).toBe(false);
    });
  });
});
