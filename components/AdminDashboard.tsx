import React, { useEffect, useState, useCallback } from 'react';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  IssueType,
  TicketFilters,
  PaginatedResponse,
  User,
} from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socket';
import {
  ClipboardList,
  Phone,
  Image as ImageIcon,
  User as UserIcon,
  Mail,
  Loader2,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertOctagon,
  Clock,
  Eye,
  Lock,
  Save,
  History,
  ArrowRight,
  Bell,
  LogOut,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  MessageSquare,
} from 'lucide-react';

interface AdminDashboardProps {
  onExit: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const { user, logout, notifications, unreadCount, markNotificationAsRead } = useAuth();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<TicketFilters>({
    status: undefined,
    issueType: undefined,
    priority: undefined,
    search: '',
  });

  // Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Internal Note State
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Agents list for assignment
  const [agents, setAgents] = useState<User[]>([]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response: PaginatedResponse<Ticket> = await ApiService.getTickets({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      setTickets(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
    } catch (e) {
      console.error('Erreur chargement tickets:', e);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const loadAgents = useCallback(async () => {
    try {
      const agentsList = await ApiService.getAgents();
      setAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (e) {
      console.error('Erreur chargement agents:', e);
      setAgents([]);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadAgents();
  }, [loadTickets, loadAgents]);

  // WebSocket updates
  useEffect(() => {
    socketService.updateHandlers({
      onTicketCreated: (ticket) => {
        setTickets((prev) => [ticket, ...prev]);
      },
      onTicketUpdated: (ticket) => {
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
        if (selectedTicket?.id === ticket.id) {
          setSelectedTicket(ticket);
        }
      },
    });
  }, [selectedTicket]);

  // Reset note when modal opens
  useEffect(() => {
    if (selectedTicket) {
      setNoteContent('');
    }
  }, [selectedTicket]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await ApiService.updateTicket(ticketId, { status: newStatus });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
      setSelectedTicket(updatedTicket);
    } catch (e) {
      console.error('Erreur mise à jour statut:', e);
    }
  };

  const handleAssign = async (ticketId: string, agentId: string | null) => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await ApiService.updateTicket(ticketId, {
        assignedToId: agentId || undefined,
        status: agentId ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN,
      });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updatedTicket : t)));
      setSelectedTicket(updatedTicket);
    } catch (e) {
      console.error('Erreur assignation:', e);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedTicket || !noteContent.trim()) return;
    setIsSavingNote(true);

    try {
      // Send as a message (internal note)
      await ApiService.sendMessage(selectedTicket.id, `[NOTE INTERNE] ${noteContent}`);
      setNoteContent('');
      // Reload ticket to get updated messages
      const updatedTicket = await ApiService.getTicketById(selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }
    } catch (e) {
      console.error('Erreur sauvegarde note:', e);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onExit();
  };

  // ============================================
  // HELPERS
  // ============================================

  const getStatusConfig = (status: TicketStatus) => {
    const configs: Record<TicketStatus, { color: string; label: string }> = {
      [TicketStatus.OPEN]: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Ouvert' },
      [TicketStatus.IN_PROGRESS]: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'En cours',
      },
      [TicketStatus.WAITING_CUSTOMER]: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Attente client',
      },
      [TicketStatus.RESOLVED]: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Résolu',
      },
      [TicketStatus.CLOSED]: {
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        label: 'Clôturé',
      },
      [TicketStatus.ESCALATED]: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Escaladé',
      },
      [TicketStatus.REOPENED]: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        label: 'Réouvert',
      },
    };
    return configs[status] || configs[TicketStatus.OPEN];
  };

  const getPriorityConfig = (priority: TicketPriority) => {
    const configs: Record<TicketPriority, { color: string; label: string }> = {
      [TicketPriority.LOW]: { color: 'bg-slate-100 text-slate-600', label: 'Basse' },
      [TicketPriority.MEDIUM]: { color: 'bg-blue-100 text-blue-600', label: 'Moyenne' },
      [TicketPriority.HIGH]: { color: 'bg-orange-100 text-orange-600', label: 'Haute' },
      [TicketPriority.URGENT]: { color: 'bg-red-100 text-red-600', label: 'Urgente' },
    };
    return configs[priority] || configs[TicketPriority.MEDIUM];
  };

  const getTypeIcon = (type: IssueType) => {
    const icons: Record<IssueType, string> = {
      [IssueType.TECHNICAL]: '🔧 Technique',
      [IssueType.DELIVERY]: '🚚 Livraison',
      [IssueType.BILLING]: '📄 Facturation',
      [IssueType.OTHER]: '❓ Autre',
    };
    return icons[type] || icons[IssueType.OTHER];
  };

  // ============================================
  // STATS
  // ============================================

  // Protection contre données undefined
  const safeTickets = tickets || [];
  const safeAgents = agents || [];

  const stats = {
    total: pagination.total,
    open: safeTickets.filter((t) => t.status === TicketStatus.OPEN).length,
    inProgress: safeTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
    resolved: safeTickets.filter(
      (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
    ).length,
    slaBreached: safeTickets.filter((t) => t.slaBreached).length,
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              KLY <span className="font-light opacity-80">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">Centre de contrôle SAV</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">Aucune notification</p>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationAsRead(notif.id)}
                        className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 ${
                          !notif.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <p className="text-sm text-slate-700">{String(notif.payload?.message || notif.type)}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{user?.displayName || 'Administrateur'}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Total Tickets</p>
            <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-blue-500 uppercase mb-2">Ouverts</p>
            <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-yellow-500 uppercase mb-2">En cours</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-green-500 uppercase mb-2">Résolus</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-red-500 uppercase mb-2">SLA Dépassés</p>
            <p className="text-3xl font-bold text-red-600">{stats.slaBreached}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              />
            </div>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: (e.target.value as TicketStatus) || undefined,
                  }))
                }
                className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
              >
                <option value="">Tous les statuts</option>
                {Object.values(TicketStatus).map((status) => (
                  <option key={status} value={status}>
                    {getStatusConfig(status).label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.issueType || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    issueType: (e.target.value as IssueType) || undefined,
                  }))
                }
                className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
              >
                <option value="">Tous les types</option>
                {Object.values(IssueType).map((type) => (
                  <option key={type} value={type}>
                    {getTypeIcon(type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.priority || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: (e.target.value as TicketPriority) || undefined,
                  }))
                }
                className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
              >
                <option value="">Toutes priorités</option>
                {Object.values(TicketPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {getPriorityConfig(priority).label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={loadTickets}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">ID & Date</th>
                  <th className="p-4">Titre</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Priorité</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Assigné à</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Chargement des tickets...
                    </td>
                  </tr>
                ) : safeTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      Aucun ticket ne correspond à vos filtres.
                    </td>
                  </tr>
                ) : (
                  safeTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <div className="font-mono font-bold text-blue-600">{t.id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(t.createdAt).toLocaleDateString()}{' '}
                          {new Date(t.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">
                          {t.title}
                        </div>
                        {t.slaBreached && (
                          <div className="flex items-center text-xs text-red-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> SLA dépassé
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {getTypeIcon(t.issueType)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            getPriorityConfig(t.priority).color
                          }`}
                        >
                          {getPriorityConfig(t.priority).label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold border ${
                            getStatusConfig(t.status).color
                          }`}
                        >
                          {getStatusConfig(t.status).label}
                        </span>
                      </td>
                      <td className="p-4">
                        {t.assignedTo ? (
                          <div className="flex items-center text-sm text-slate-700">
                            <UserIcon className="w-4 h-4 mr-1 text-slate-400" />
                            {t.assignedTo.displayName}
                          </div>
                        ) : (
                          <span className="text-slate-300">Non assigné</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-all"
                          title="Voir les détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} tickets)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {selectedTicket.id.slice(0, 8)}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      getStatusConfig(selectedTicket.status).color
                    }`}
                  >
                    {getStatusConfig(selectedTicket.status).label}
                  </span>
                  {selectedTicket.slaBreached && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> SLA
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Créé le {new Date(selectedTicket.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8">
              {/* Title & Priority */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{selectedTicket.title}</h3>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      getPriorityConfig(selectedTicket.priority).color
                    }`}
                  >
                    Priorité: {getPriorityConfig(selectedTicket.priority).label}
                  </span>
                  <span className="text-sm text-slate-500">{getTypeIcon(selectedTicket.issueType)}</span>
                </div>
              </div>

              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Client</h3>
                  <div className="space-y-2">
                    {selectedTicket.customer && (
                      <div className="flex items-center text-slate-700">
                        <UserIcon className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">{selectedTicket.customer.displayName}</span>
                      </div>
                    )}
                    {selectedTicket.contactName && (
                      <div className="flex items-center text-slate-700">
                        <UserIcon className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">{selectedTicket.contactName}</span>
                      </div>
                    )}
                    {selectedTicket.contactEmail && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                        {selectedTicket.contactEmail}
                      </div>
                    )}
                    {selectedTicket.contactPhone && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                        {selectedTicket.contactPhone}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Assignation</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-slate-700">
                      <UserPlus className="w-4 h-4 mr-2 text-blue-500" />
                      <select
                        value={selectedTicket.assignedToId || ''}
                        onChange={(e) => handleAssign(selectedTicket.id, e.target.value || null)}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Non assigné</option>
                        {safeAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedTicket.order && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <ClipboardList className="w-4 h-4 mr-2 text-slate-400" />
                        Commande: {selectedTicket.order.orderNumber}
                      </div>
                    )}
                    {selectedTicket.callbackSlot && (
                      <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded w-fit text-xs font-medium">
                        <Phone className="w-3 h-3 mr-1" />
                        Rappel: {selectedTicket.callbackSlot}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                  Description du problème
                </h3>
                <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedTicket.description || 'Aucune description fournie.'}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                    Pièces jointes
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedTicket.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                      >
                        <ImageIcon className="w-5 h-5 mr-2" />
                        <span className="text-sm font-medium truncate">{attachment.fileName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes Section */}
              <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200/60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-yellow-800 flex items-center uppercase tracking-wide">
                    <Lock className="w-4 h-4 mr-2" />
                    Ajouter une note interne
                  </h3>
                  {isSavingNote && (
                    <span className="text-xs text-yellow-600 italic">Enregistrement...</span>
                  )}
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full p-4 text-sm bg-white border border-yellow-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none min-h-[100px]"
                  placeholder="Ajoutez des notes privées pour l'équipe SAV ici..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !noteContent.trim()}
                    className="flex items-center bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer la note
                  </button>
                </div>
              </div>

              {/* History Section */}
              {selectedTicket.history && selectedTicket.history.length > 0 && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center">
                    <History className="w-4 h-4 mr-2" />
                    Historique
                  </h3>
                  <div className="space-y-4">
                    {selectedTicket.history.map((log) => (
                      <div key={log.id} className="flex items-start">
                        <div className="flex flex-col items-center mr-4">
                          <div className="w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-lg p-3 flex-grow shadow-sm">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                            {log.actor && (
                              <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                {log.actor.displayName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="font-medium text-slate-600">{log.action}</span>
                            {log.field && (
                              <>
                                <ArrowRight className="w-4 h-4 mx-2 text-slate-300" />
                                <span className="text-slate-500">
                                  {log.field}: {log.oldValue} → {log.newValue}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center sticky bottom-0">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    socketService.joinTicketRoom(selectedTicket.id);
                    // TODO: Open chat panel
                  }}
                  className="flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ouvrir le chat
                </button>
              </div>

              <div className="flex gap-3">
                {selectedTicket.status === TicketStatus.OPEN ||
                selectedTicket.status === TicketStatus.IN_PROGRESS ? (
                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, TicketStatus.RESOLVED)}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marquer comme résolu
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, TicketStatus.REOPENED)}
                    className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Rouvrir le dossier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
