import React, { useState, useEffect } from 'react';
import { AdminApi } from '../services/api';
import {
  Ticket,
  TicketMessage,
  User,
  TicketStatus,
  TicketPriority,
} from '../types';
import {
  ArrowLeft,
  Send,
  Clock,
  User as UserIcon,
  MessageSquare,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import MacroSelector from './macros/MacroSelector';

// ============================================
// PROPS
// ============================================

interface TicketDetailProps {
  ticket: Ticket;
  agents: User[];
  onBack: () => void;
  onUpdate: (ticket: Ticket) => void;
}

// ============================================
// COMPOSANT
// ============================================

const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  agents,
  onBack,
  onUpdate,
}) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Charger les messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await AdminApi.getTicketMessages(ticket.id);
        setMessages(msgs || []);
      } catch (error) {
        console.error('Erreur chargement messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [ticket.id]);

  // Envoyer un message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const msg = await AdminApi.sendMessage(ticket.id, newMessage, isInternal);
      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), msg]);
      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Envoi échoué'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Mettre à jour le ticket
  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    setIsUpdating(true);
    try {
      console.log('Updating ticket:', ticket.id, updates);
      const updated = await AdminApi.updateTicket(ticket.id, updates);
      console.log('Updated ticket:', updated);
      onUpdate(updated);
    } catch (error) {
      console.error('Erreur mise à jour ticket:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Mise à jour échouée'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Helpers
  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, string> = {
      OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      WAITING_CUSTOMER: 'bg-purple-100 text-purple-700 border-purple-200',
      RESOLVED: 'bg-green-100 text-green-700 border-green-200',
      CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
      ESCALATED: 'bg-red-100 text-red-700 border-red-200',
      REOPENED: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à la liste</span>
        </button>

        <div className="flex items-center space-x-3">
          {/* Macro Selector */}
          <MacroSelector
            ticket={ticket}
            onMacroApplied={(macro, success) => {
              if (success) {
                // Reload ticket data after macro execution
                AdminApi.getTicketById(ticket.id).then(onUpdate).catch(console.error);
                AdminApi.getTicketMessages(ticket.id).then(setMessages).catch(console.error);
              }
            }}
          />

          {ticket.slaBreached && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>SLA Dépassé</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800">{ticket.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  #{ticket.id.slice(0, 8)} - Créé le{' '}
                  {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                  ticket.status
                )}`}
              >
                {ticket.status}
              </span>
            </div>

            {ticket.description && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            )}

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="mt-4 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Conversation</span>
              </h2>
            </div>

            {/* Message List */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : !Array.isArray(messages) || messages.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Aucun message</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.isInternal
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 shadow-sm'
                        : 'bg-slate-50 border border-slate-100'
                    }`}
                  >
                    {/* Internal Note Banner */}
                    {msg.isInternal && (
                      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-amber-200">
                        <div className="flex items-center space-x-1.5 px-2 py-1 bg-amber-200 text-amber-800 rounded-md">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold uppercase tracking-wide">Note Interne</span>
                        </div>
                        <span className="text-xs text-amber-600 italic">
                          Invisible pour le client
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.isInternal
                            ? 'bg-amber-200'
                            : 'bg-indigo-100'
                        }`}>
                          {msg.isInternal ? (
                            <EyeOff className="w-4 h-4 text-amber-700" />
                          ) : (
                            <UserIcon className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            msg.isInternal ? 'text-amber-800' : 'text-slate-700'
                          }`}>
                            {msg.author?.displayName || 'Utilisateur'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs ${
                        msg.isInternal ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {new Date(msg.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className={`whitespace-pre-wrap ${
                      msg.isInternal
                        ? 'text-amber-900 italic font-medium pl-2 border-l-4 border-amber-300'
                        : 'text-slate-700'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* New Message Form */}
            <form
              onSubmit={handleSendMessage}
              className={`p-4 border-t-2 transition-colors duration-200 ${
                isInternal
                  ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Internal Note Toggle */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setIsInternal(!isInternal)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isInternal
                      ? 'bg-amber-200 text-amber-800 shadow-sm ring-2 ring-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isInternal ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Note Interne</span>
                      <EyeOff className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Message Public</span>
                    </>
                  )}
                </button>
                {isInternal && (
                  <span className="text-xs text-amber-600 italic flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Ce message sera invisible pour le client</span>
                  </span>
                )}
              </div>

              {/* Input Area */}
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternal ? "Écrire une note interne..." : "Écrire un message au client..."}
                    rows={2}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors ${
                      isInternal
                        ? 'border-amber-300 bg-white focus:ring-amber-400 focus:border-amber-400 placeholder-amber-400'
                        : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim()) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                  {isInternal && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className={`px-5 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors font-medium ${
                    isInternal
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span className="hidden sm:inline">Envoyer</span>
                    </>
                  )}
                </button>
              </div>

              {/* Helper Text */}
              <p className="mt-2 text-xs text-slate-400">
                Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
              </p>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Actions rapides</h3>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Statut</label>
              <select
                value={ticket.status}
                onChange={(e) => {
                  console.log('Status change triggered:', e.target.value);
                  handleUpdateTicket({ status: e.target.value as TicketStatus });
                }}
                disabled={isUpdating}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="OPEN">Ouvert</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="WAITING_CUSTOMER">Attente client</option>
                <option value="ESCALATED">Escaladé</option>
                <option value="RESOLVED">Résolu</option>
                <option value="CLOSED">Fermé</option>
              </select>
            </div>

            {/* Priority */}
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-2">Priorité</label>
              <select
                value={ticket.priority}
                onChange={(e) => {
                  console.log('Priority change triggered:', e.target.value);
                  handleUpdateTicket({ priority: e.target.value as TicketPriority });
                }}
                disabled={isUpdating}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm text-slate-600 mb-2">Assigné à</label>
              <select
                value={ticket.assignedToId || ''}
                onChange={(e) =>
                  handleUpdateTicket({ assignedToId: e.target.value || null })
                }
                disabled={isUpdating}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Non assigné</option>
                {Array.isArray(agents) && agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Informations client</h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Nom</p>
                <p className="text-slate-800 font-medium">
                  {ticket.customer?.displayName || ticket.contactName || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Email</p>
                <p className="text-slate-800">
                  {ticket.contactEmail || ticket.customer?.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Téléphone</p>
                <p className="text-slate-800">
                  {ticket.contactPhone || ticket.customer?.phone || '-'}
                </p>
              </div>
              {ticket.companyName && (
                <div>
                  <p className="text-slate-500">Entreprise</p>
                  <p className="text-slate-800">{ticket.companyName}</p>
                </div>
              )}
            </div>
          </div>

          {/* SLA Info */}
          {ticket.slaDeadline && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>SLA</span>
              </h3>
              <div className="text-sm">
                <p className="text-slate-500">Échéance</p>
                <p
                  className={`font-medium ${
                    ticket.slaBreached ? 'text-red-600' : 'text-slate-800'
                  }`}
                >
                  {new Date(ticket.slaDeadline).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
