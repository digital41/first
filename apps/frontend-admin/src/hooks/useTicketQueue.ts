import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ticket } from '../types';
import { AdminApi } from '../services/api';
import {
  groupTicketsBySection,
  sortTicketsByPriority,
  getNextTicket,
  QueueSection,
} from '../lib/queueHelpers';

// ============================================
// USE TICKET QUEUE HOOK
// ============================================
// Manages operator's ticket queue with smart sorting

interface UseTicketQueueOptions {
  operatorId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTicketQueueReturn {
  // Data
  tickets: Ticket[];
  groupedTickets: Record<QueueSection, Ticket[]>;
  currentTicket: Ticket | null;
  nextTicket: Ticket | null;

  // Counts
  totalCount: number;
  urgentCount: number;
  toProcessCount: number;

  // State
  isLoading: boolean;
  isFocusMode: boolean;
  error: Error | null;

  // Actions
  refresh: () => Promise<void>;
  selectTicket: (ticket: Ticket | null) => void;
  goToNextTicket: () => void;
  toggleFocusMode: () => void;
}

export function useTicketQueue(options: UseTicketQueueOptions = {}): UseTicketQueueReturn {
  const { operatorId, autoRefresh = true, refreshInterval = 30000 } = options;

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const filters = operatorId ? { assignedToId: operatorId } : {};
      const response = await AdminApi.getTickets({ ...filters, limit: 100 });
      const ticketData = Array.isArray(response.data) ? response.data : [];
      setTickets(sortTicketsByPriority(ticketData));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur chargement queue'));
      console.error('Queue fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [operatorId]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchTickets, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTickets]);

  // Grouped tickets
  const groupedTickets = useMemo(() => {
    return groupTicketsBySection(tickets);
  }, [tickets]);

  // Counts
  const totalCount = tickets.length;
  const urgentCount = groupedTickets.urgent.length;
  const toProcessCount = groupedTickets.toProcess.length;

  // Next ticket
  const nextTicket = useMemo(() => {
    return getNextTicket(tickets, currentTicket?.id);
  }, [tickets, currentTicket]);

  // Actions
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchTickets();
  }, [fetchTickets]);

  const selectTicket = useCallback((ticket: Ticket | null) => {
    setCurrentTicket(ticket);
  }, []);

  const goToNextTicket = useCallback(() => {
    if (nextTicket) {
      setCurrentTicket(nextTicket);
    }
  }, [nextTicket]);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  return {
    tickets,
    groupedTickets,
    currentTicket,
    nextTicket,
    totalCount,
    urgentCount,
    toProcessCount,
    isLoading,
    isFocusMode,
    error,
    refresh,
    selectTicket,
    goToNextTicket,
    toggleFocusMode,
  };
}

export default useTicketQueue;
