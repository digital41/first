import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/database.js';
import { SageService } from '../../src/services/sage.service.js';

// Types for mocked prisma
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  order: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockSageService = SageService as unknown as {
  getCustomer: ReturnType<typeof vi.fn>;
  getCustomerOrders: ReturnType<typeof vi.fn>;
};

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login (loginByCustomerCode)', () => {
    it('should authenticate user with valid SAGE customer code', async () => {
      const mockSageCustomer = {
        customerCode: 'C001',
        companyName: 'Test Company',
        email: 'test@company.com',
        phone: '0123456789',
      };

      const mockUser = {
        id: 'user-123',
        customerCode: 'C001',
        email: 'test@company.com',
        displayName: 'Test Company',
        role: 'CUSTOMER',
        phone: '0123456789',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: null,
      };

      mockSageService.getCustomer.mockResolvedValue(mockSageCustomer);
      mockSageService.getCustomerOrders.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Import after mocks are set up
      const { loginByCustomerCode } = await import('../../src/services/auth.service.js');

      const result = await loginByCustomerCode('C001');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.customerCode).toBe('C001');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should create new user if not exists in local database', async () => {
      const mockSageCustomer = {
        customerCode: 'NEWCUST',
        companyName: 'New Company',
        email: 'new@company.com',
        phone: null,
      };

      const mockNewUser = {
        id: 'new-user-456',
        customerCode: 'NEWCUST',
        email: 'new@company.com',
        displayName: 'New Company',
        role: 'CUSTOMER',
        phone: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: null,
      };

      mockSageService.getCustomer.mockResolvedValue(mockSageCustomer);
      mockSageService.getCustomerOrders.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockNewUser);

      const { loginByCustomerCode } = await import('../../src/services/auth.service.js');

      const result = await loginByCustomerCode('NEWCUST');

      expect(result.user.customerCode).toBe('NEWCUST');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw error for empty customer code', async () => {
      const { loginByCustomerCode } = await import('../../src/services/auth.service.js');

      await expect(loginByCustomerCode('')).rejects.toThrow('Le code client est requis');
    });

    it('should throw error if customer not found in SAGE and no local user', async () => {
      mockSageService.getCustomer.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { loginByCustomerCode } = await import('../../src/services/auth.service.js');

      await expect(loginByCustomerCode('INVALID')).rejects.toThrow(
        'Aucun compte client trouvé avec ce code dans SAGE'
      );
    });
  });

  describe('POST /api/auth/admin/login', () => {
    it('should authenticate admin with valid credentials', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('AdminPass123', 12);

      const mockAdmin = {
        id: 'admin-001',
        email: 'admin@kly.com',
        displayName: 'Admin User',
        role: 'ADMIN',
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerCode: null,
        phone: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.user.update.mockResolvedValue(mockAdmin);

      const { loginAdmin } = await import('../../src/services/auth.service.js');

      const result = await loginAdmin('admin@kly.com', 'AdminPass123');

      expect(result.user.email).toBe('admin@kly.com');
      expect(result.user.role).toBe('ADMIN');
      expect(result.tokens).toHaveProperty('accessToken');
    });

    it('should reject customer trying to access admin', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('Pass123', 12);

      const mockCustomer = {
        id: 'customer-001',
        email: 'customer@test.com',
        displayName: 'Customer',
        role: 'CUSTOMER',
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerCode: 'C001',
        phone: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockCustomer);

      const { loginAdmin } = await import('../../src/services/auth.service.js');

      await expect(loginAdmin('customer@test.com', 'Pass123')).rejects.toThrow(
        "Ce compte n'a pas accès à l'administration"
      );
    });

    it('should reject invalid password', async () => {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('CorrectPass', 12);

      const mockAdmin = {
        id: 'admin-002',
        email: 'admin2@kly.com',
        displayName: 'Admin 2',
        role: 'ADMIN',
        passwordHash: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerCode: null,
        phone: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

      const { loginAdmin } = await import('../../src/services/auth.service.js');

      await expect(loginAdmin('admin2@kly.com', 'WrongPass')).rejects.toThrow(
        'Identifiants incorrects'
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../../src/config/index.js');

      const mockUser = {
        id: 'user-refresh-001',
        email: 'refresh@test.com',
        displayName: 'Refresh User',
        role: 'CUSTOMER',
        passwordHash: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerCode: 'C001',
        phone: null,
      };

      // Create a valid refresh token
      const refreshToken = jwt.default.sign(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          type: 'refresh',
        },
        config.jwt.refreshSecret,
        { expiresIn: '7d' }
      );

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const { refreshTokens } = await import('../../src/services/auth.service.js');

      const result = await refreshTokens(refreshToken);

      expect(result.user.id).toBe('user-refresh-001');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const { refreshTokens } = await import('../../src/services/auth.service.js');

      await expect(refreshTokens('invalid-token')).rejects.toThrow(
        'Refresh token invalide ou expiré'
      );
    });

    it('should reject access token used as refresh token', async () => {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../../src/config/index.js');

      // Create an access token (wrong type)
      const accessToken = jwt.default.sign(
        {
          userId: 'user-001',
          email: 'test@test.com',
          role: 'CUSTOMER',
          type: 'access', // Wrong type
        },
        config.jwt.refreshSecret, // Using refresh secret but wrong type
        { expiresIn: '15m' }
      );

      const { refreshTokens } = await import('../../src/services/auth.service.js');

      await expect(refreshTokens(accessToken)).rejects.toThrow('Type de token invalide');
    });
  });
});
