import React, { useState, useEffect, useCallback } from 'react';
import { AdminApi } from '../services/api';
import {
  Ticket,
  TicketStats,
  User,
  TicketStatus,
  TicketPriority,
  TicketFilters,
} from '../types';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Square,
  CheckSquare,
} from 'lucide-react';
import TicketDetail from './TicketDetail';
import SLACountdown from './SLACountdown';
import QuickActionsBar from './QuickActionsBar';
import TicketPreviewPanel from './TicketPreviewPanel';
import AgentWorkloadWidget from './AgentWorkloadWidget';
import SmartFilterPresets from './SmartFilterPresets';
import { useAuth } from '../contexts/AuthContext';

// ============================================
// COMPOSANT DASHBOARD ADMIN
// ============================================

interface AdminDashboardProps {
  onNavigateToUsers?: () => void;
  initialFilters?: TicketFilters;
  pageTitle?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateToUsers,
  initialFilters = {},
  pageTitle,
}) => {
  const { user } = useAuth();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // New feature states
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null);

  // Vérifier si l'utilisateur est admin/supervisor (voit tout) ou agent (voit seulement ses tickets)
  const isManagerRole = user?.role && ['ADMIN', 'SUPERVISOR'].includes(user.role);

  // Charger les données
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pour les agents: filtrer uniquement leurs tickets assignés
      const ticketFilters = {
        ...filters,
        page,
        limit: 10,
        search: searchTerm || undefined,
        // Si agent, ajouter le filtre sur assignedToId
        ...((!isManagerRole && user?.id) ? { assignedToId: user.id } : {}),
      };

      const [ticketsRes, statsRes, agentsRes] = await Promise.all([
        AdminApi.getTickets(ticketFilters),
        AdminApi.getTicketStats(),
        AdminApi.getAgents(),
      ]);

      const ticketData = Array.isArray(ticketsRes.data) ? ticketsRes.data : [];
      setTickets(ticketData);
      setTotalPages(ticketsRes.totalPages || 1);

      // Pour les agents: calculer les stats uniquement sur leurs tickets
      if (!isManagerRole && user?.id) {
        // Calculer les stats personnalisées pour l'agent
        const myTickets = ticketData;
        const myStats: TicketStats = {
          total: ticketsRes.total || myTickets.length,
          byStatus: {
            OPEN: myTickets.filter(t => t.status === 'OPEN').length,
            IN_PROGRESS: myTickets.filter(t => t.status === 'IN_PROGRESS').length,
            WAITING_CUSTOMER: myTickets.filter(t => t.status === 'WAITING_CUSTOMER').length,
            RESOLVED: myTickets.filter(t => t.status === 'RESOLVED').length,
            CLOSED: myTickets.filter(t => t.status === 'CLOSED').length,
            ESCALATED: myTickets.filter(t => t.status === 'ESCALATED').length,
            REOPENED: myTickets.filter(t => t.status === 'REOPENED').length,
          },
          byPriority: {
            LOW: myTickets.filter(t => t.priority === 'LOW').length,
            MEDIUM: myTickets.filter(t => t.priority === 'MEDIUM').length,
            HIGH: myTickets.filter(t => t.priority === 'HIGH').length,
            URGENT: myTickets.filter(t => t.priority === 'URGENT').length,
          },
          byIssueType: {
            TECHNICAL: myTickets.filter(t => t.issueType === 'TECHNICAL').length,
            BILLING: myTickets.filter(t => t.issueType === 'BILLING').length,
            DELIVERY: myTickets.filter(t => t.issueType === 'DELIVERY').length,
            OTHER: myTickets.filter(t => t.issueType === 'OTHER').length,
          },
          slaBreached: myTickets.filter(t => t.slaBreached).length,
        };
        setStats(myStats);
      } else {
        setStats(statsRes);
      }

      setAgents(Array.isArray(agentsRes) ? agentsRes : []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, searchTerm, isManagerRole, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selection handlers
  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTicketIds.length === tickets.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(tickets.map((t) => t.id));
    }
  };

  // Bulk action handlers
  const handleBulkAssign = async (agentId: string, ticketIds: string[]) => {
    await Promise.all(
      ticketIds.map((id) =>
        AdminApi.updateTicket(id, { assignedToId: agentId || null })
      )
    );
    loadData();
  };

  const handleBulkStatusChange = async (status: TicketStatus, ticketIds: string[]) => {
    await Promise.all(
      ticketIds.map((id) => AdminApi.updateTicket(id, { status }))
    );
    loadData();
  };

  const handleBulkPriorityChange = async (priority: TicketPriority, ticketIds: string[]) => {
    await Promise.all(
      ticketIds.map((id) => AdminApi.updateTicket(id, { priority }))
    );
    loadData();
  };

  // Helpers
  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
      RESOLVED: 'bg-green-100 text-green-700',
      CLOSED: 'bg-slate-100 text-slate-600',
      ESCALATED: 'bg-red-100 text-red-700',
      REOPENED: 'bg-orange-100 text-orange-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const getStatusLabel = (status: TicketStatus): string => {
    const labels: Record<TicketStatus, string> = {
      OPEN: 'Ouvert',
      IN_PROGRESS: 'En cours',
      WAITING_CUSTOMER: 'Attente client',
      RESOLVED: 'Résolu',
      CLOSED: 'Fermé',
      ESCALATED: 'Escaladé',
      REOPENED: 'Réouvert',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: TicketPriority) => {
    const colors: Record<TicketPriority, string> = {
      LOW: 'bg-slate-100 text-slate-600',
      MEDIUM: 'bg-blue-100 text-blue-600',
      HIGH: 'bg-orange-100 text-orange-600',
      URGENT: 'bg-red-100 text-red-600',
    };
    return colors[priority] || 'bg-slate-100 text-slate-600';
  };

  const getPriorityLabel = (priority: TicketPriority): string => {
    const labels: Record<TicketPriority, string> = {
      LOW: 'Basse',
      MEDIUM: 'Moyenne',
      HIGH: 'Haute',
      URGENT: 'Urgente',
    };
    return labels[priority] || priority;
  };

  // Si un ticket est sélectionné, afficher le détail
  if (selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        agents={agents}
        onBack={() => {
          setSelectedTicket(null);
          loadData();
        }}
        onUpdate={(updated) => {
          setSelectedTicket(updated);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Page Title */}
      {pageTitle && (
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{pageTitle}</h1>
      )}

      {/* Agent Workload - Horizontal bar at top (visible only for ADMIN/SUPERVISOR) */}
      {isManagerRole && (
        <div className="mb-4">
          <AgentWorkloadWidget
            agents={agents}
            tickets={tickets}
            onNavigateToUsers={onNavigateToUsers}
            horizontal
          />
        </div>
      )}

      {/* KPI Stats Cards - Ligne compacte */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          icon={<Inbox className="w-5 h-5" />}
          label="Tickets Ouverts"
          value={stats?.byStatus?.OPEN || 0}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="En cours"
          value={stats?.byStatus?.IN_PROGRESS || 0}
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Résolus"
          value={stats?.byStatus?.RESOLVED || 0}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="SLA Dépassé"
          value={stats?.slaBreached || 0}
          color="red"
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4">
          {/* Smart Filter Presets */}
          <SmartFilterPresets
            currentFilters={filters}
            onApplyFilters={setFilters}
            currentUserId={user?.id}
          />

          {/* Quick Actions Bar (visible when tickets selected) */}
          <QuickActionsBar
            selectedCount={selectedTicketIds.length}
            selectedIds={selectedTicketIds}
            agents={agents}
            onBulkAssign={handleBulkAssign}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkPriorityChange={handleBulkPriorityChange}
            onClearSelection={() => setSelectedTicketIds([])}
          />

          {/* Toolbar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un ticket..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-3">
                <select
                  value={filters.status || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as TicketStatus || undefined })
                  }
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="OPEN">Ouvert</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="WAITING_CUSTOMER">Attente client</option>
                  <option value="ESCALATED">Escaladé</option>
                  <option value="RESOLVED">Résolu</option>
                  <option value="CLOSED">Fermé</option>
                </select>

                <select
                  value={filters.priority || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, priority: e.target.value as TicketPriority || undefined })
                  }
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Toutes priorités</option>
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                  <option value="URGENT">Urgente</option>
                </select>

                <button
                  onClick={loadData}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {selectedTicketIds.length === tickets.length && tickets.length > 0 ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priorité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">SLA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigné à</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        Aucun ticket trouvé
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          selectedTicketIds.includes(ticket.id) ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleTicketSelection(ticket.id)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {selectedTicketIds.includes(ticket.id) ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 truncate max-w-xs">{ticket.title}</p>
                            <p className="text-xs text-slate-500">#{ticket.id.slice(0, 8)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">
                            {ticket.customer?.displayName || ticket.contactName || '-'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ticket.contactEmail || ticket.customer?.email || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <SLACountdown
                            deadline={ticket.slaDeadline ?? null}
                            breached={ticket.slaBreached}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {ticket.assignedTo ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Users className="w-3 h-3 text-indigo-600" />
                              </div>
                              <span className="text-sm text-slate-700">{ticket.assignedTo.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Non assigné</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => setPreviewTicket(ticket)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Aperçu rapide"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedTicket(ticket)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Voir le détail"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
      </div>

      {/* Ticket Preview Panel */}
      <TicketPreviewPanel
        ticket={previewTicket}
        onClose={() => setPreviewTicket(null)}
        onOpenFull={(ticket) => {
          setPreviewTicket(null);
          setSelectedTicket(ticket);
        }}
      />
    </div>
  );
};

// ============================================
// COMPOSANT STAT CARD
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-lg font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
