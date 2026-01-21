import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { generateTokenPair, hashPassword, verifyPassword } from '../../src/services/auth.service.js';

// Mock config
vi.mock('../../src/config/index.js', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('Auth Service', () => {
  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER' as const,
        customerCode: 'C001',
      };

      const tokens = generateTokenPair(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should include user info in access token payload', () => {
      const user = {
        id: 'user-456',
        email: 'admin@example.com',
        role: 'ADMIN' as const,
        customerCode: null,
      };

      const tokens = generateTokenPair(user);
      const decoded = jwt.decode(tokens.accessToken) as Record<string, unknown>;

      expect(decoded.userId).toBe('user-456');
      expect(decoded.email).toBe('admin@example.com');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.type).toBe('access');
    });

    it('should include correct type in refresh token', () => {
      const user = {
        id: 'user-789',
        email: 'agent@example.com',
        role: 'AGENT' as const,
        customerCode: null,
      };

      const tokens = generateTokenPair(user);
      const decoded = jwt.decode(tokens.refreshToken) as Record<string, unknown>;

      expect(decoded.type).toBe('refresh');
      expect(decoded.userId).toBe('user-789');
    });

    it('should handle user without email', () => {
      const user = {
        id: 'user-no-email',
        email: null,
        role: 'CUSTOMER' as const,
        customerCode: 'C002',
      };

      const tokens = generateTokenPair(user);
      const decoded = jwt.decode(tokens.accessToken) as Record<string, unknown>;

      expect(decoded.email).toBe('');
      expect(decoded.customerCode).toBe('C002');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'SecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'MyPassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'MyPassword123';
      const hash = await bcrypt.hash(password, 12);

      const result = await verifyPassword('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });
});
