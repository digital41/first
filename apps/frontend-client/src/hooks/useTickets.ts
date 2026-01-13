import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketFilters, PaginatedResponse, TicketStats } from '@/types';
import { ticketsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface UseTicketsReturn {
  tickets: Ticket[];
  meta: PaginatedResponse<Ticket>['meta'] | null;
  stats: TicketStats | null;
  isLoading: boolean;
  error: string | null;
  filters: TicketFilters;
  setFilters: (filters: TicketFilters) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useTickets(initialFilters: TicketFilters = {}): UseTicketsReturn {
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Ticket>['meta'] | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchTickets = useCallback(async (reset = true) => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);

      const [response, statsResponse] = await Promise.all([
        ticketsApi.getAll(reset ? { ...filters, page: 1 } : filters),
        ticketsApi.getStats(),
      ]);

      if (reset) {
        setTickets(response.data);
      } else {
        setTickets((prev) => [...prev, ...response.data]);
      }
      setMeta(response.meta);
      setStats(statsResponse);
    } catch (err) {
      setError('Erreur lors du chargement des tickets');
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, filters]);

  // Fetch on mount and filter change
  useEffect(() => {
    fetchTickets(true);
  }, [filters.status, filters.priority, filters.issueType, filters.search]);

  const loadMore = useCallback(async () => {
    if (!meta || meta.page >= meta.totalPages) return;

    setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }));
    await fetchTickets(false);
  }, [meta, fetchTickets]);

  const updateFilters = useCallback((newFilters: TicketFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  return {
    tickets,
    meta,
    stats,
    isLoading,
    error,
    filters,
    setFilters: updateFilters,
    refresh: () => fetchTickets(true),
    loadMore,
  };
}

export default useTickets;
