import { Ticket, TicketStatus, TicketPriority } from '../types';

// ============================================
// QUEUE HELPERS - Sorting & Prioritization
// ============================================

/**
 * Priority weights for sorting
 */
const PRIORITY_WEIGHTS: Record<TicketPriority, number> = {
  URGENT: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
};

/**
 * Status weights for sorting (lower = more urgent)
 */
const STATUS_WEIGHTS: Record<TicketStatus, number> = {
  ESCALATED: 0,
  OPEN: 10,
  REOPENED: 15,
  IN_PROGRESS: 20,
  WAITING_CUSTOMER: 50,
  RESOLVED: 80,
  CLOSED: 100,
};

/**
 * Queue sections for categorization
 */
export type QueueSection = 'urgent' | 'toProcess' | 'waitingCustomer' | 'resolved';

/**
 * Calculate SLA urgency score (higher = more urgent)
 */
export function calculateSLAScore(ticket: Ticket): number {
  if (ticket.slaBreached) return 200; // Maximum urgency
  if (!ticket.slaDeadline) return 0;

  const now = new Date().getTime();
  const deadline = new Date(ticket.slaDeadline).getTime();
  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) return 200; // Breached
  if (hoursRemaining <= 1) return 150; // Critical
  if (hoursRemaining <= 4) return 100; // Warning
  if (hoursRemaining <= 8) return 50;  // Attention
  return 0; // Safe
}

/**
 * Calculate ticket age score (older = higher score)
 */
export function calculateAgeScore(ticket: Ticket): number {
  const now = new Date().getTime();
  const created = new Date(ticket.createdAt).getTime();
  const hoursOld = (now - created) / (1000 * 60 * 60);

  return Math.min(hoursOld, 100); // Cap at 100
}

/**
 * Calculate total priority score for sorting
 */
export function calculateTotalScore(ticket: Ticket): number {
  const priorityScore = PRIORITY_WEIGHTS[ticket.priority] || 0;
  const statusScore = 100 - (STATUS_WEIGHTS[ticket.status] || 50);
  const slaScore = calculateSLAScore(ticket);
  const ageScore = calculateAgeScore(ticket);

  // Weighted sum
  return (slaScore * 2) + (priorityScore * 1.5) + statusScore + (ageScore * 0.5);
}

/**
 * Sort tickets by priority, SLA, and age
 */
export function sortTicketsByPriority(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => calculateTotalScore(b) - calculateTotalScore(a));
}

/**
 * Categorize ticket into queue section
 */
export function getTicketSection(ticket: Ticket): QueueSection {
  // Urgent: SLA breached or critical, or URGENT/HIGH priority with OPEN/ESCALATED status
  if (
    ticket.slaBreached ||
    calculateSLAScore(ticket) >= 150 ||
    (ticket.priority === 'URGENT' && ['OPEN', 'ESCALATED', 'REOPENED'].includes(ticket.status))
  ) {
    return 'urgent';
  }

  // Waiting customer
  if (ticket.status === 'WAITING_CUSTOMER') {
    return 'waitingCustomer';
  }

  // Resolved/Closed
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    return 'resolved';
  }

  // To process (default)
  return 'toProcess';
}

/**
 * Group tickets by section
 */
export function groupTicketsBySection(tickets: Ticket[]): Record<QueueSection, Ticket[]> {
  const groups: Record<QueueSection, Ticket[]> = {
    urgent: [],
    toProcess: [],
    waitingCustomer: [],
    resolved: [],
  };

  tickets.forEach((ticket) => {
    const section = getTicketSection(ticket);
    groups[section].push(ticket);
  });

  // Sort each section by priority
  Object.keys(groups).forEach((key) => {
    groups[key as QueueSection] = sortTicketsByPriority(groups[key as QueueSection]);
  });

  return groups;
}

/**
 * Get next ticket to process from queue
 */
export function getNextTicket(tickets: Ticket[], currentTicketId?: string): Ticket | null {
  const sorted = sortTicketsByPriority(
    tickets.filter(
      (t) =>
        t.id !== currentTicketId &&
        !['RESOLVED', 'CLOSED'].includes(t.status)
    )
  );

  return sorted[0] || null;
}

/**
 * Format section label
 */
export function getSectionLabel(section: QueueSection): string {
  const labels: Record<QueueSection, string> = {
    urgent: 'Urgent',
    toProcess: 'A traiter',
    waitingCustomer: 'En attente client',
    resolved: 'Resolus',
  };
  return labels[section];
}

/**
 * Get section color classes
 */
export function getSectionColors(section: QueueSection): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<QueueSection, { bg: string; text: string; border: string }> = {
    urgent: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    toProcess: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    waitingCustomer: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    resolved: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
  };
  return colors[section];
}
