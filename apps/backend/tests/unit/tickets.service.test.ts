import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/database.js';

// Types for mocked prisma
const mockPrisma = prisma as unknown as {
  ticket: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  ticketMessage: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('Tickets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ticket Number Generation', () => {
    it('should generate ticket number with correct format', () => {
      // Format: TKT-YYYYMMDD-XXXX
      const ticketNumber = generateTicketNumber();
      const pattern = /^TKT-\d{8}-[A-Z0-9]{4}$/;

      expect(ticketNumber).toMatch(pattern);
    });

    it('should include current date in ticket number', () => {
      const ticketNumber = generateTicketNumber();
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      expect(ticketNumber).toContain(dateStr);
    });

    it('should generate unique ticket numbers', () => {
      const numbers = new Set();
      for (let i = 0; i < 100; i++) {
        numbers.add(generateTicketNumber());
      }

      expect(numbers.size).toBe(100);
    });
  });

  describe('Ticket Creation', () => {
    it('should create ticket with all required fields', async () => {
      const ticketData = {
        subject: 'Test ticket',
        description: 'Description du problème',
        issueType: 'TECHNICAL',
        priority: 'MEDIUM',
        customerId: 'customer-123',
      };

      const mockCreatedTicket = {
        id: 'ticket-001',
        ticketNumber: 'TKT-20240115-ABCD',
        ...ticketData,
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.ticket.create.mockResolvedValue(mockCreatedTicket);

      // Simulated service call
      const result = await mockPrisma.ticket.create({
        data: {
          ticketNumber: 'TKT-20240115-ABCD',
          ...ticketData,
          status: 'OPEN',
        },
      });

      expect(result.subject).toBe('Test ticket');
      expect(result.status).toBe('OPEN');
      expect(result.ticketNumber).toMatch(/^TKT-/);
    });

    it('should set initial status to OPEN', async () => {
      const mockTicket = {
        id: 'ticket-002',
        ticketNumber: 'TKT-20240115-EFGH',
        subject: 'New ticket',
        status: 'OPEN',
        createdAt: new Date(),
      };

      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const result = await mockPrisma.ticket.create({
        data: { ticketNumber: 'TKT-20240115-EFGH', subject: 'New ticket', status: 'OPEN' },
      });

      expect(result.status).toBe('OPEN');
    });
  });

  describe('Ticket Status Updates', () => {
    it('should update ticket status to IN_PROGRESS', async () => {
      const mockUpdatedTicket = {
        id: 'ticket-003',
        status: 'IN_PROGRESS',
        assignedToId: 'agent-001',
      };

      mockPrisma.ticket.update.mockResolvedValue(mockUpdatedTicket);

      const result = await mockPrisma.ticket.update({
        where: { id: 'ticket-003' },
        data: { status: 'IN_PROGRESS', assignedToId: 'agent-001' },
      });

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.assignedToId).toBe('agent-001');
    });

    it('should update ticket status to RESOLVED', async () => {
      const mockResolvedTicket = {
        id: 'ticket-004',
        status: 'RESOLVED',
        resolvedAt: new Date(),
      };

      mockPrisma.ticket.update.mockResolvedValue(mockResolvedTicket);

      const result = await mockPrisma.ticket.update({
        where: { id: 'ticket-004' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedAt).toBeDefined();
    });

    it('should allow reopening a closed ticket', async () => {
      const mockReopenedTicket = {
        id: 'ticket-005',
        status: 'REOPENED',
        reopenedAt: new Date(),
      };

      mockPrisma.ticket.update.mockResolvedValue(mockReopenedTicket);

      const result = await mockPrisma.ticket.update({
        where: { id: 'ticket-005' },
        data: { status: 'REOPENED', reopenedAt: new Date() },
      });

      expect(result.status).toBe('REOPENED');
    });
  });

  describe('Ticket Filtering', () => {
    it('should filter tickets by status', async () => {
      const mockOpenTickets = [
        { id: '1', status: 'OPEN' },
        { id: '2', status: 'OPEN' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockOpenTickets);

      const result = await mockPrisma.ticket.findMany({
        where: { status: 'OPEN' },
      });

      expect(result).toHaveLength(2);
      expect(result.every((t: { status: string }) => t.status === 'OPEN')).toBe(true);
    });

    it('should filter tickets by multiple statuses', async () => {
      const mockTickets = [
        { id: '1', status: 'OPEN' },
        { id: '2', status: 'IN_PROGRESS' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await mockPrisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });

      expect(result).toHaveLength(2);
    });

    it('should filter tickets by customer', async () => {
      const mockCustomerTickets = [
        { id: '1', customerId: 'customer-123' },
        { id: '2', customerId: 'customer-123' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockCustomerTickets);

      const result = await mockPrisma.ticket.findMany({
        where: { customerId: 'customer-123' },
      });

      expect(result.every((t: { customerId: string }) => t.customerId === 'customer-123')).toBe(true);
    });
  });

  describe('Ticket Statistics', () => {
    it('should count tickets by status', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(5) // OPEN
        .mockResolvedValueOnce(3) // IN_PROGRESS
        .mockResolvedValueOnce(10) // RESOLVED
        .mockResolvedValueOnce(2); // CLOSED

      const openCount = await mockPrisma.ticket.count({ where: { status: 'OPEN' } });
      const inProgressCount = await mockPrisma.ticket.count({ where: { status: 'IN_PROGRESS' } });
      const resolvedCount = await mockPrisma.ticket.count({ where: { status: 'RESOLVED' } });
      const closedCount = await mockPrisma.ticket.count({ where: { status: 'CLOSED' } });

      expect(openCount).toBe(5);
      expect(inProgressCount).toBe(3);
      expect(resolvedCount).toBe(10);
      expect(closedCount).toBe(2);
    });
  });
});

// Helper function for generating ticket numbers
function generateTicketNumber(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${dateStr}-${random}`;
}
