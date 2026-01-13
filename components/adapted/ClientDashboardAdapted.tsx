import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Search,
  Loader2,
  Calendar,
  MessageSquare,
  Package,
  RefreshCw
} from 'lucide-react';
import { Ticket, TicketStatus } from '../../types';
import { ApiService } from '../../services/api';

interface ClientDashboardAdaptedProps {
  onNewRequest: () => void;
  onViewTicket: (ticket: Ticket) => void;
  onViewAllTickets: () => void;
}

// Status configuration for visual consistency
const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Clock className="w-4 h-4" />, label: 'En attente' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <RefreshCw className="w-4 h-4" />, label: 'En cours' },
  WAITING_CUSTOMER: { bg: 'bg-purple-50', text: 'text-purple-700', icon: <MessageSquare className="w-4 h-4" />, label: 'Action requise' },
  RESOLVED: { bg: 'bg-green-50', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Résolu' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <CheckCircle className="w-4 h-4" />, label: 'Clôturé' },
};

const ClientDashboardAdapted: React.FC<ClientDashboardAdaptedProps> = ({
  onNewRequest,
  onViewTicket,
  onViewAllTickets
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await ApiService.getTickets();
      // Handle paginated response - extract data array
      const ticketsArray = Array.isArray(response) ? response : (response.data || []);
      setTickets(ticketsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load tickets', error);
      setTickets([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  // Get active tickets (not closed/resolved)
  const activeTickets = tickets.filter(t =>
    t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED
  );

  // Get the most urgent ticket requiring action
  const urgentTicket = activeTickets.find(t => t.status === TicketStatus.WAITING_CUSTOMER);

  // Filter tickets by search
  const filteredTickets = tickets.filter(t =>
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status: TicketStatus) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Bonjour, bienvenue sur votre espace
        </h1>
        <p className="text-slate-500">
          Gérez vos demandes SAV et suivez leur avancement en temps réel.
        </p>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Active Requests Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-slate-800">{activeTickets.length}</span>
          </div>
          <h3 className="font-semibold text-slate-700">Demandes actives</h3>
          <p className="text-sm text-slate-400 mt-1">En cours de traitement</p>
        </div>

        {/* Response Time Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-3xl font-bold text-slate-800">2h</span>
          </div>
          <h3 className="font-semibold text-slate-700">Temps de réponse moyen</h3>
          <p className="text-sm text-slate-400 mt-1">Pendant les heures ouvrées</p>
        </div>

        {/* Quick Action Card */}
        <button
          onClick={onNewRequest}
          className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white text-left hover:from-blue-700 hover:to-indigo-700 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <ChevronRight className="w-6 h-6 opacity-60 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="font-semibold text-lg">Nouvelle demande</h3>
          <p className="text-sm opacity-80 mt-1">Ouvrir un dossier SAV</p>
        </button>
      </div>

      {/* Urgent Alert Banner */}
      {urgentTicket && (
        <div
          onClick={() => onViewTicket(urgentTicket)}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors group"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mr-4">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900">Action requise sur le dossier {urgentTicket.id}</h4>
              <p className="text-sm text-amber-700">Nous attendons des informations de votre part</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
        </div>
      )}

      {/* Tickets Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Mes demandes</h2>
            <button
              onClick={onViewAllTickets}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir tout
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro de dossier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500">Chargement de vos demandes...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-2">Aucune demande trouvée</h3>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery ? "Essayez une autre recherche" : "Vous n'avez pas encore de dossier SAV"}
              </p>
              {!searchQuery && (
                <button
                  onClick={onNewRequest}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une demande
                </button>
              )}
            </div>
          ) : (
            filteredTickets.slice(0, 5).map((ticket) => {
              const statusConfig = getStatusConfig(ticket.status);
              return (
                <div
                  key={ticket.id}
                  onClick={() => onViewTicket(ticket)}
                  className="p-5 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-blue-600">{ticket.id}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium mb-1 line-clamp-1">
                        {ticket.title || ticket.description?.split('\n')[0]}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ticket.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        {ticket.companyName && (
                          <span>{ticket.companyName}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reassurance Footer */}
      <div className="mt-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Support disponible</p>
              <p className="text-sm text-slate-500">Lun-Ven 8h-18h | digital@klygroupe.com</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Besoin d'aide urgente ?</p>
            <p className="font-bold text-slate-800">+33 1 23 45 67 89</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardAdapted;
