import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSLAScore,
  calculateAgeScore,
  calculateTotalScore,
  sortTicketsByPriority,
  getTicketSection,
  groupTicketsBySection,
  getNextTicket,
  getSectionLabel,
  getSectionColors,
} from '@/lib/queueHelpers';
import { Ticket } from '@/types';

// Helper to create mock tickets
const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 'ticket-001',
  title: 'Test Ticket',
  description: 'Test description',
  status: 'OPEN',
  priority: 'MEDIUM',
  category: 'TECHNICAL',
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  slaDeadline: null,
  slaBreached: false,
  customer: null,
  assignedTo: null,
  ...overrides,
} as Ticket);

describe('Queue Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateSLAScore', () => {
    it('should return 200 for breached SLA', () => {
      const ticket = createMockTicket({ slaBreached: true });
      expect(calculateSLAScore(ticket)).toBe(200);
    });

    it('should return 0 for ticket without SLA deadline', () => {
      const ticket = createMockTicket({ slaDeadline: null });
      expect(calculateSLAScore(ticket)).toBe(0);
    });

    it('should return 200 for past deadline', () => {
      const ticket = createMockTicket({
        slaDeadline: '2024-01-15T10:00:00.000Z', // 2 hours ago
      });
      expect(calculateSLAScore(ticket)).toBe(200);
    });

    it('should return 150 for deadline within 1 hour', () => {
      const ticket = createMockTicket({
        slaDeadline: '2024-01-15T12:30:00.000Z', // 30 minutes
      });
      expect(calculateSLAScore(ticket)).toBe(150);
    });

    it('should return 100 for deadline within 4 hours', () => {
      const ticket = createMockTicket({
        slaDeadline: '2024-01-15T14:00:00.000Z', // 2 hours
      });
      expect(calculateSLAScore(ticket)).toBe(100);
    });

    it('should return 50 for deadline within 8 hours', () => {
      const ticket = createMockTicket({
        slaDeadline: '2024-01-15T18:00:00.000Z', // 6 hours
      });
      expect(calculateSLAScore(ticket)).toBe(50);
    });

    it('should return 0 for deadline more than 8 hours away', () => {
      const ticket = createMockTicket({
        slaDeadline: '2024-01-16T12:00:00.000Z', // 24 hours
      });
      expect(calculateSLAScore(ticket)).toBe(0);
    });
  });

  describe('calculateAgeScore', () => {
    it('should calculate age in hours', () => {
      const ticket = createMockTicket({
        createdAt: '2024-01-15T10:00:00.000Z', // 2 hours ago
      });
      expect(calculateAgeScore(ticket)).toBe(2);
    });

    it('should cap age score at 100', () => {
      const ticket = createMockTicket({
        createdAt: '2024-01-10T12:00:00.000Z', // 5 days ago = 120 hours
      });
      expect(calculateAgeScore(ticket)).toBe(100);
    });
  });

  describe('calculateTotalScore', () => {
    it('should give higher score to urgent priority', () => {
      const urgentTicket = createMockTicket({ priority: 'URGENT' });
      const lowTicket = createMockTicket({ priority: 'LOW' });

      expect(calculateTotalScore(urgentTicket)).toBeGreaterThan(
        calculateTotalScore(lowTicket)
      );
    });

    it('should give higher score to breached SLA', () => {
      const breachedTicket = createMockTicket({ slaBreached: true });
      const normalTicket = createMockTicket({ slaBreached: false });

      expect(calculateTotalScore(breachedTicket)).toBeGreaterThan(
        calculateTotalScore(normalTicket)
      );
    });

    it('should give higher score to ESCALATED status', () => {
      const escalatedTicket = createMockTicket({ status: 'ESCALATED' });
      const closedTicket = createMockTicket({ status: 'CLOSED' });

      expect(calculateTotalScore(escalatedTicket)).toBeGreaterThan(
        calculateTotalScore(closedTicket)
      );
    });
  });

  describe('sortTicketsByPriority', () => {
    it('should sort tickets by total score descending', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'LOW' }),
        createMockTicket({ id: '2', priority: 'URGENT', slaBreached: true }),
        createMockTicket({ id: '3', priority: 'HIGH' }),
      ];

      const sorted = sortTicketsByPriority(tickets);

      expect(sorted[0].id).toBe('2'); // Urgent + breached
      expect(sorted[1].id).toBe('3'); // High
      expect(sorted[2].id).toBe('1'); // Low
    });

    it('should not mutate original array', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'LOW' }),
        createMockTicket({ id: '2', priority: 'HIGH' }),
      ];

      sortTicketsByPriority(tickets);

      expect(tickets[0].id).toBe('1');
    });
  });

  describe('getTicketSection', () => {
    it('should return "urgent" for breached SLA', () => {
      const ticket = createMockTicket({ slaBreached: true });
      expect(getTicketSection(ticket)).toBe('urgent');
    });

    it('should return "urgent" for URGENT priority with OPEN status', () => {
      const ticket = createMockTicket({ priority: 'URGENT', status: 'OPEN' });
      expect(getTicketSection(ticket)).toBe('urgent');
    });

    it('should return "waitingCustomer" for WAITING_CUSTOMER status', () => {
      const ticket = createMockTicket({ status: 'WAITING_CUSTOMER' });
      expect(getTicketSection(ticket)).toBe('waitingCustomer');
    });

    it('should return "resolved" for RESOLVED status', () => {
      const ticket = createMockTicket({ status: 'RESOLVED' });
      expect(getTicketSection(ticket)).toBe('resolved');
    });

    it('should return "resolved" for CLOSED status', () => {
      const ticket = createMockTicket({ status: 'CLOSED' });
      expect(getTicketSection(ticket)).toBe('resolved');
    });

    it('should return "toProcess" for regular tickets', () => {
      const ticket = createMockTicket({ priority: 'MEDIUM', status: 'IN_PROGRESS' });
      expect(getTicketSection(ticket)).toBe('toProcess');
    });
  });

  describe('groupTicketsBySection', () => {
    it('should group tickets correctly', () => {
      const tickets = [
        createMockTicket({ id: '1', slaBreached: true }),
        createMockTicket({ id: '2', status: 'WAITING_CUSTOMER' }),
        createMockTicket({ id: '3', status: 'RESOLVED' }),
        createMockTicket({ id: '4', status: 'IN_PROGRESS' }),
      ];

      const groups = groupTicketsBySection(tickets);

      expect(groups.urgent).toHaveLength(1);
      expect(groups.urgent[0].id).toBe('1');

      expect(groups.waitingCustomer).toHaveLength(1);
      expect(groups.waitingCustomer[0].id).toBe('2');

      expect(groups.resolved).toHaveLength(1);
      expect(groups.resolved[0].id).toBe('3');

      expect(groups.toProcess).toHaveLength(1);
      expect(groups.toProcess[0].id).toBe('4');
    });

    it('should sort tickets within each section', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'LOW', status: 'IN_PROGRESS' }),
        createMockTicket({ id: '2', priority: 'HIGH', status: 'IN_PROGRESS' }),
      ];

      const groups = groupTicketsBySection(tickets);

      expect(groups.toProcess[0].id).toBe('2'); // HIGH first
      expect(groups.toProcess[1].id).toBe('1'); // LOW second
    });
  });

  describe('getNextTicket', () => {
    it('should return highest priority ticket', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'LOW', status: 'OPEN' }),
        createMockTicket({ id: '2', priority: 'HIGH', status: 'OPEN' }),
      ];

      const next = getNextTicket(tickets);

      expect(next?.id).toBe('2');
    });

    it('should exclude current ticket', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'URGENT', status: 'OPEN' }),
        createMockTicket({ id: '2', priority: 'HIGH', status: 'OPEN' }),
      ];

      const next = getNextTicket(tickets, '1');

      expect(next?.id).toBe('2');
    });

    it('should exclude resolved and closed tickets', () => {
      const tickets = [
        createMockTicket({ id: '1', priority: 'URGENT', status: 'RESOLVED' }),
        createMockTicket({ id: '2', priority: 'LOW', status: 'OPEN' }),
      ];

      const next = getNextTicket(tickets);

      expect(next?.id).toBe('2');
    });

    it('should return null for empty queue', () => {
      const next = getNextTicket([]);
      expect(next).toBeNull();
    });
  });

  describe('getSectionLabel', () => {
    it('should return correct labels', () => {
      expect(getSectionLabel('urgent')).toBe('Urgent');
      expect(getSectionLabel('toProcess')).toBe('A traiter');
      expect(getSectionLabel('waitingCustomer')).toBe('En attente client');
      expect(getSectionLabel('resolved')).toBe('Resolus');
    });
  });

  describe('getSectionColors', () => {
    it('should return color classes for urgent section', () => {
      const colors = getSectionColors('urgent');
      expect(colors.bg).toBe('bg-red-50');
      expect(colors.text).toBe('text-red-700');
      expect(colors.border).toBe('border-red-200');
    });

    it('should return color classes for toProcess section', () => {
      const colors = getSectionColors('toProcess');
      expect(colors.bg).toBe('bg-blue-50');
    });

    it('should return color classes for waitingCustomer section', () => {
      const colors = getSectionColors('waitingCustomer');
      expect(colors.bg).toBe('bg-amber-50');
    });

    it('should return color classes for resolved section', () => {
      const colors = getSectionColors('resolved');
      expect(colors.bg).toBe('bg-green-50');
    });
  });
});
