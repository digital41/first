import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock user for authenticated tests
export const mockUser = {
  id: 'user-test-001',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'CUSTOMER' as const,
  avatarUrl: null,
  phone: '0612345678',
  customerCode: 'C001',
  companyName: 'Test Company',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Mock admin user
export const mockAdminUser = {
  id: 'admin-test-001',
  email: 'admin@kly.com',
  displayName: 'Admin User',
  role: 'ADMIN' as const,
  avatarUrl: null,
  phone: null,
  customerCode: null,
  companyName: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Mock ticket
export const mockTicket = {
  id: 'ticket-test-001',
  ticketNumber: 'TKT-20240115-ABCD',
  subject: 'Test ticket',
  description: 'Test description',
  status: 'OPEN' as const,
  priority: 'MEDIUM' as const,
  issueType: 'TECHNICAL' as const,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  customer: mockUser,
  customerId: mockUser.id,
};

// Mock order
export const mockOrder = {
  id: 'order-test-001',
  orderNumber: 'BC-2024-001',
  status: 'DELIVERED' as const,
  totalAmount: 1500.00,
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  createdAt: '2024-01-10T00:00:00.000Z',
  items: [
    {
      id: 'item-001',
      description: 'Product A',
      quantity: 2,
      unitPrice: 500,
      totalPrice: 1000,
    },
    {
      id: 'item-002',
      description: 'Product B',
      quantity: 1,
      unitPrice: 500,
      totalPrice: 500,
    },
  ],
};

// Providers wrapper for testing
interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Utility to wait for loading states
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock API response helper
export function createMockApiResponse<T>(data: T, success = true) {
  return {
    success,
    data,
  };
}

// Mock paginated response helper
export function createMockPaginatedResponse<T>(
  data: T[],
  page = 1,
  limit = 20,
  total = data.length
) {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
