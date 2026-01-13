import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  ChevronDown,
  Ticket,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { ticketsApi } from '@/services/api';
import { Ticket as TicketType, TicketStatus, TicketPriority, IssueType, PaginatedResponse } from '@/types';
import { StatusBadge, PriorityBadge, IssueTypeBadge, PageLoading, EmptyState } from '@/components/common';
import { formatRelativeTime, formatTicketNumber, cn } from '@/utils/helpers';

export function TicketsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<TicketType>['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState<string | false>(false);

  // Get filters from URL
  const statusFilter = searchParams.get('status') as TicketStatus | null;
  const priorityFilter = searchParams.get('priority') as TicketPriority | null;
  const issueTypeFilter = searchParams.get('issueType') as IssueType | null;

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const response = await ticketsApi.getAll({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          issueType: issueTypeFilter || undefined,
          search: search || undefined,
          page: 1,
          limit: 20,
        });
        setTickets(response?.data || []);
        setMeta(response?.meta || null);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setTickets([]);
        setMeta(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [statusFilter, priorityFilter, issueTypeFilter, search]);

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearch('');
  };

  const hasActiveFilters = statusFilter || priorityFilter || issueTypeFilter || search;

  const FilterDropdown = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string | null;
    options: { value: string; label: string }[];
    onChange: (value: string | null) => void;
  }) => (
    <div className="relative">
      <button
        onClick={() => setShowFilters(showFilters === label ? false : label)}
        className={cn(
          'flex items-center px-3 py-2 border rounded-lg text-sm transition-colors',
          value
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        )}
      >
        {value ? options.find((o) => o.value === value)?.label : label}
        <ChevronDown size={16} className="ml-2" />
      </button>
      {showFilters === label && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => {
              onChange(null);
              setShowFilters(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
          >
            Tous
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setShowFilters(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                value === option.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Mes tickets</h1>
          <p className="page-subtitle">
            {meta?.total || 0} ticket(s) au total
          </p>
        </div>
        <Link to="/tickets/new" className="btn-primary">
          <PlusCircle size={18} className="mr-2" />
          Nouveau ticket
        </Link>
      </div>

      {/* Filters bar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown
              label="Statut"
              value={statusFilter}
              options={[
                { value: 'OPEN', label: 'Ouvert' },
                { value: 'IN_PROGRESS', label: 'En cours' },
                { value: 'WAITING_CUSTOMER', label: 'En attente' },
                { value: 'RESOLVED', label: 'Résolu' },
                { value: 'CLOSED', label: 'Fermé' },
              ]}
              onChange={(value) => updateFilter('status', value)}
            />
            <FilterDropdown
              label="Priorité"
              value={priorityFilter}
              options={[
                { value: 'LOW', label: 'Basse' },
                { value: 'MEDIUM', label: 'Moyenne' },
                { value: 'HIGH', label: 'Haute' },
                { value: 'URGENT', label: 'Urgente' },
              ]}
              onChange={(value) => updateFilter('priority', value)}
            />
            <FilterDropdown
              label="Type"
              value={issueTypeFilter}
              options={[
                { value: 'TECHNICAL', label: 'Technique' },
                { value: 'DELIVERY', label: 'Livraison' },
                { value: 'BILLING', label: 'Facturation' },
                { value: 'OTHER', label: 'Autre' },
              ]}
              onChange={(value) => updateFilter('issueType', value)}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 px-2"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <PageLoading />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket size={32} />}
          title="Aucun ticket"
          description={
            hasActiveFilters
              ? "Aucun ticket ne correspond à vos critères de recherche."
              : "Vous n'avez pas encore créé de ticket. Créez-en un pour contacter notre équipe."
          }
          action={
            hasActiveFilters
              ? { label: 'Effacer les filtres', onClick: clearFilters }
              : { label: 'Créer un ticket', href: '/tickets/new' }
          }
        />
      ) : (
        <div className="card divide-y divide-gray-200">
          {/* Table header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Ticket</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Priorité</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Date</div>
          </div>

          {/* Tickets */}
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              className="block hover:bg-gray-50 transition-colors"
            >
              {/* Mobile layout */}
              <div className="lg:hidden p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-primary-600">
                      {formatTicketNumber(ticket.ticketNumber)}
                    </span>
                    <h3 className="font-medium text-gray-900 mt-1">{ticket.title}</h3>
                  </div>
                  <StatusBadge status={ticket.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <PriorityBadge priority={ticket.priority} size="sm" />
                  <IssueTypeBadge issueType={ticket.issueType} size="sm" />
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-4 items-center">
                <div className="col-span-4">
                  <span className="text-sm font-medium text-primary-600">
                    {formatTicketNumber(ticket.ticketNumber)}
                  </span>
                  <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{ticket.description}</p>
                </div>
                <div className="col-span-2">
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="col-span-2">
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="col-span-2">
                  <IssueTypeBadge issueType={ticket.issueType} />
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm text-gray-900">
                    {formatRelativeTime(ticket.createdAt)}
                  </p>
                  {ticket.slaDeadline && (
                    <div className="flex items-center justify-end text-xs text-gray-500 mt-1">
                      <Clock size={12} className="mr-1" />
                      SLA
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {meta.page} sur {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              className="btn-outline btn-sm disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              className="btn-outline btn-sm disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Click outside handler for filters */}
      {showFilters && (
        <div className="fixed inset-0 z-0" onClick={() => setShowFilters(false)} />
      )}
    </div>
  );
}

export default TicketsListPage;
