import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock admin user
export const mockAdminUser = {
  id: 'admin-001',
  email: 'admin@kly.com',
  displayName: 'Admin User',
  role: 'ADMIN' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// Mock agent user
export const mockAgentUser = {
  id: 'agent-001',
  email: 'agent@kly.com',
  displayName: 'Agent User',
  role: 'AGENT' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// Mock ticket for testing
export const mockTicket = {
  id: 'ticket-001',
  title: 'Test Ticket',
  description: 'Test description',
  status: 'OPEN' as const,
  priority: 'MEDIUM' as const,
  category: 'TECHNICAL',
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  slaDeadline: '2024-01-16T10:00:00.000Z',
  slaBreached: false,
  customer: {
    id: 'customer-001',
    displayName: 'John Doe',
    email: 'john@example.com',
  },
  assignedTo: null,
};

// Mock urgent ticket
export const mockUrgentTicket = {
  ...mockTicket,
  id: 'ticket-urgent',
  priority: 'URGENT' as const,
  status: 'ESCALATED' as const,
  slaBreached: true,
};

// Providers wrapper
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

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
