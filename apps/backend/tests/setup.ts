import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Prisma client
vi.mock('../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    ticketHistory: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((ops) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops);
      }
      return ops({
        user: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        ticket: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        ticketHistory: {
          create: vi.fn(),
          createMany: vi.fn(),
        },
      });
    }),
  },
}));

// Mock SAGE service
vi.mock('../src/services/sage.service.js', () => ({
  SageService: {
    getCustomer: vi.fn(),
    getCustomerOrders: vi.fn(),
    getOrder: vi.fn(),
  },
}));
