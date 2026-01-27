import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/database.js';

// Types for mocked prisma
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  ticketHistory: {
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  notification: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// Mock data
const mockTicket = {
  id: 'ticket-001',
  ticketNumber: 1001,
  title: 'Test Ticket',
  description: 'Test description',
  status: 'OPEN',
  priority: 'MEDIUM',
  issueType: 'TECHNICAL',
  customerId: 'customer-001',
  assignedToId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  slaBreached: false,
  slaDeadline: null,
  contactName: 'John Doe',
  contactEmail: 'john@test.com',
  contactPhone: null,
  companyName: null,
  serialNumber: null,
  equipmentModel: null,
  equipmentBrand: null,
  errorCode: null,
  tags: [],
  orderId: null,
};

const mockAdmin = {
  id: 'admin-001',
  email: 'admin@kly.com',
  displayName: 'Admin User',
  role: 'ADMIN',
  isActive: true,
};

const mockAgent = {
  id: 'agent-001',
  email: 'agent@kly.com',
  displayName: 'Agent User',
  role: 'AGENT',
  isActive: true,
};

describe('Tickets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ticket Listing', () => {
    it('should list tickets with pagination', async () => {
      const ticketsList = [
        { ...mockTicket, id: 'ticket-001', ticketNumber: 1001 },
        { ...mockTicket, id: 'ticket-002', ticketNumber: 1002 },
        { ...mockTicket, id: 'ticket-003', ticketNumber: 1003 },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(ticketsList);
      mockPrisma.ticket.count.mockResolvedValue(3);

      const { listTickets } = await import('../../src/services/ticket.service.js');

      const result = await listTickets({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
    });

    it('should filter tickets by status', async () => {
      const openTickets = [
        { ...mockTicket, id: 'ticket-001', status: 'OPEN' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(openTickets);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const { listTickets } = await import('../../src/services/ticket.service.js');

      const result = await listTickets({
        page: 1,
        limit: 10,
        status: 'OPEN' as any,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('OPEN');
    });

    it('should filter tickets by priority', async () => {
      const urgentTickets = [
        { ...mockTicket, id: 'ticket-001', priority: 'URGENT' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(urgentTickets);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const { listTickets } = await import('../../src/services/ticket.service.js');

      const result = await listTickets({
        page: 1,
        limit: 10,
        priority: 'URGENT' as any,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].priority).toBe('URGENT');
    });

    it('should search tickets by title or description', async () => {
      const searchResults = [
        { ...mockTicket, title: 'Machine problem', description: 'Error on startup' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(searchResults);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const { listTickets } = await import('../../src/services/ticket.service.js');

      const result = await listTickets({
        page: 1,
        limit: 10,
        search: 'machine',
      });

      expect(result.data).toHaveLength(1);
    });

    it('should exclude specified statuses', async () => {
      const activeTickets = [
        { ...mockTicket, status: 'OPEN' },
        { ...mockTicket, id: 'ticket-002', status: 'IN_PROGRESS' },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(activeTickets);
      mockPrisma.ticket.count.mockResolvedValue(2);

      const { listTickets } = await import('../../src/services/ticket.service.js');

      const result = await listTickets({
        page: 1,
        limit: 10,
        excludeStatus: ['RESOLVED', 'CLOSED'] as any,
      });

      expect(result.data).toHaveLength(2);
      result.data.forEach(ticket => {
        expect(['RESOLVED', 'CLOSED']).not.toContain(ticket.status);
      });
    });
  });

  describe('Ticket Creation', () => {
    it('should create a new ticket', async () => {
      const newTicket = {
        ...mockTicket,
        id: 'new-ticket-001',
        ticketNumber: 1004,
      };

      mockPrisma.ticket.create.mockResolvedValue(newTicket);
      mockPrisma.ticketHistory.create.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([mockAdmin]);
      mockPrisma.notification.create.mockResolvedValue({});

      // Mock auto-assign to return null (no available agent)
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      const { createTicket } = await import('../../src/services/ticket.service.js');

      const result = await createTicket({
        title: 'New Test Ticket',
        description: 'Test description',
        issueType: 'TECHNICAL',
        priority: 'MEDIUM',
      }, 'customer-001');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('ticketNumber');
    });

    it('should create ticket with contact info', async () => {
      const newTicket = {
        ...mockTicket,
        contactName: 'Jane Doe',
        contactEmail: 'jane@test.com',
        contactPhone: '0612345678',
      };

      mockPrisma.ticket.create.mockResolvedValue(newTicket);
      mockPrisma.ticketHistory.create.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      const { createTicket } = await import('../../src/services/ticket.service.js');

      const result = await createTicket({
        title: 'Contact Test',
        issueType: 'BILLING',
        contactName: 'Jane Doe',
        contactEmail: 'jane@test.com',
        contactPhone: '0612345678',
      });

      expect(result.contactName).toBe('Jane Doe');
      expect(result.contactEmail).toBe('jane@test.com');
    });
  });

  describe('Ticket Updates', () => {
    it('should update ticket status', async () => {
      const existingTicket = { ...mockTicket, status: 'OPEN' };
      const updatedTicket = { ...mockTicket, status: 'IN_PROGRESS' };

      mockPrisma.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrisma.$transaction.mockResolvedValue([updatedTicket]);
      mockPrisma.notification.create.mockResolvedValue({});

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      const result = await updateTicket(
        'ticket-001',
        { status: 'IN_PROGRESS' },
        'admin-001',
        'ADMIN'
      );

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update ticket priority', async () => {
      const existingTicket = { ...mockTicket, priority: 'MEDIUM' };
      const updatedTicket = { ...mockTicket, priority: 'URGENT' };

      mockPrisma.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrisma.$transaction.mockResolvedValue([updatedTicket]);
      mockPrisma.notification.create.mockResolvedValue({});

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      const result = await updateTicket(
        'ticket-001',
        { priority: 'URGENT' },
        'admin-001',
        'ADMIN'
      );

      expect(result.priority).toBe('URGENT');
    });

    it('should assign ticket to agent', async () => {
      const existingTicket = { ...mockTicket, assignedToId: null };
      const updatedTicket = { ...mockTicket, assignedToId: 'agent-001' };

      mockPrisma.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrisma.$transaction.mockResolvedValue([updatedTicket]);
      mockPrisma.notification.create.mockResolvedValue({});

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      const result = await updateTicket(
        'ticket-001',
        { assignedToId: 'agent-001' },
        'admin-001',
        'ADMIN'
      );

      expect(result.assignedToId).toBe('agent-001');
    });

    it('should throw error when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      await expect(
        updateTicket('nonexistent', { status: 'CLOSED' }, 'admin-001', 'ADMIN')
      ).rejects.toThrow('Ticket non trouvé');
    });

    it('should prevent customer from modifying other users tickets', async () => {
      const otherUserTicket = { ...mockTicket, customerId: 'other-customer' };
      mockPrisma.ticket.findUnique.mockResolvedValue(otherUserTicket);

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      await expect(
        updateTicket('ticket-001', { status: 'CLOSED' }, 'customer-001', 'CUSTOMER')
      ).rejects.toThrow('Vous ne pouvez pas modifier ce ticket');
    });

    it('should allow customer to reopen their own ticket', async () => {
      const customerTicket = { ...mockTicket, customerId: 'customer-001', status: 'RESOLVED' };
      const reopenedTicket = { ...customerTicket, status: 'REOPENED' };

      mockPrisma.ticket.findUnique.mockResolvedValue(customerTicket);
      mockPrisma.$transaction.mockResolvedValue([reopenedTicket]);
      mockPrisma.notification.create.mockResolvedValue({});

      const { updateTicket } = await import('../../src/services/ticket.service.js');

      const result = await updateTicket(
        'ticket-001',
        { status: 'REOPENED' },
        'customer-001',
        'CUSTOMER'
      );

      expect(result.status).toBe('REOPENED');
    });
  });

  describe('Ticket Statistics', () => {
    it('should return global stats for admin', async () => {
      mockPrisma.ticket.count.mockResolvedValue(100);
      mockPrisma.ticket.groupBy.mockResolvedValueOnce([
        { status: 'OPEN', _count: 20 },
        { status: 'IN_PROGRESS', _count: 30 },
        { status: 'RESOLVED', _count: 40 },
        { status: 'CLOSED', _count: 10 },
      ]);
      mockPrisma.ticket.groupBy.mockResolvedValueOnce([
        { issueType: 'TECHNICAL', _count: 50 },
        { issueType: 'BILLING', _count: 30 },
        { issueType: 'DELIVERY', _count: 20 },
      ]);
      mockPrisma.ticket.groupBy.mockResolvedValueOnce([
        { priority: 'LOW', _count: 10 },
        { priority: 'MEDIUM', _count: 50 },
        { priority: 'HIGH', _count: 30 },
        { priority: 'URGENT', _count: 10 },
      ]);
      mockPrisma.ticket.count.mockResolvedValueOnce(5); // openedToday
      mockPrisma.ticket.count.mockResolvedValueOnce(3); // slaBreached

      const { getTicketStats } = await import('../../src/services/ticket.service.js');

      const stats = await getTicketStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byPriority');
      expect(stats).toHaveProperty('slaBreached');
    });

    it('should return filtered stats for agent', async () => {
      mockPrisma.ticket.count.mockResolvedValue(25);
      mockPrisma.ticket.groupBy.mockResolvedValue([
        { status: 'OPEN', _count: 10 },
        { status: 'IN_PROGRESS', _count: 15 },
      ]);

      const { getTicketStats } = await import('../../src/services/ticket.service.js');

      const stats = await getTicketStats('agent-001');

      expect(stats).toHaveProperty('total');
    });
  });

  describe('Get Single Ticket', () => {
    it('should return ticket with all relations', async () => {
      const fullTicket = {
        ...mockTicket,
        customer: { id: 'customer-001', displayName: 'Customer', email: 'c@test.com' },
        assignedTo: { id: 'agent-001', displayName: 'Agent' },
        messages: [],
        history: [],
        attachments: [],
        order: null,
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(fullTicket);

      const { getTicket } = await import('../../src/services/ticket.service.js');

      const result = await getTicket('ticket-001');

      expect(result).toHaveProperty('id', 'ticket-001');
      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('messages');
    });

    it('should return null for non-existent ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const { getTicket } = await import('../../src/services/ticket.service.js');

      const result = await getTicket('nonexistent');

      expect(result).toBeNull();
    });
  });
});
