import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Calendar,
  Phone,
  Mail,
  Building2,
  FileText,
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
  Download,
  Image,
  Film
} from 'lucide-react';
import { Ticket, TicketStatus, TicketMessage } from '../../types';
import { ApiService } from '../../services/api';

interface TicketDetailAdaptedProps {
  ticket: Ticket;
  onBack: () => void;
  onRefresh: () => void;
}

// Timeline event types
interface TimelineEvent {
  id: string;
  type: 'created' | 'status_change' | 'message' | 'attachment' | 'sla_warning';
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, unknown>;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Clock className="w-5 h-5" />, label: 'En attente de traitement' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <RefreshCw className="w-5 h-5" />, label: 'Pris en charge' },
  WAITING_CUSTOMER: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: <MessageSquare className="w-5 h-5" />, label: 'En attente de votre réponse' },
  RESOLVED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="w-5 h-5" />, label: 'Résolu' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: <CheckCircle className="w-5 h-5" />, label: 'Clôturé' },
  ESCALATED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertCircle className="w-5 h-5" />, label: 'Escaladé' },
};

const TicketDetailAdapted: React.FC<TicketDetailAdaptedProps> = ({ ticket, onBack, onRefresh }) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'details'>('timeline');

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;

  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

  const loadMessages = async () => {
    try {
      const data = await ApiService.getTicketMessages(ticket.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    try {
      await ApiService.sendTicketMessage(ticket.id, newMessage);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Build timeline from ticket history
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Creation event
    events.push({
      id: 'created',
      type: 'created',
      title: 'Dossier créé',
      description: 'Votre demande a été enregistrée',
      timestamp: new Date(ticket.createdAt),
    });

    // Add message events
    messages.forEach((msg, idx) => {
      events.push({
        id: `msg-${idx}`,
        type: 'message',
        title: msg.isFromCustomer ? 'Vous avez répondu' : 'Réponse de l\'équipe KLY',
        description: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
        timestamp: new Date(msg.createdAt),
        user: msg.senderName,
      });
    });

    // Add status change events from history if available
    if (ticket.history) {
      ticket.history.forEach((entry, idx) => {
        events.push({
          id: `history-${idx}`,
          type: 'status_change',
          title: `Statut modifié: ${entry.newStatus}`,
          description: entry.comment,
          timestamp: new Date(entry.createdAt),
          user: entry.userName,
        });
      });
    }

    // Sort by timestamp
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const timeline = buildTimeline();

  // Calculate SLA progress
  const getSlaProgress = () => {
    if (!ticket.slaDeadline) return null;
    const now = new Date();
    const deadline = new Date(ticket.slaDeadline);
    const created = new Date(ticket.createdAt);
    const total = deadline.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const percentage = Math.min(100, Math.max(0, (elapsed / total) * 100));
    const remaining = deadline.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));

    return {
      percentage,
      hoursRemaining,
      isBreached: ticket.slaBreached || remaining < 0,
      isWarning: hoursRemaining < 4 && !ticket.slaBreached,
    };
  };

  const slaProgress = getSlaProgress();

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour à mes demandes
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden mb-6">
        {/* Status Banner */}
        <div className={`${statusConfig.bg} ${statusConfig.border} border-b p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full ${statusConfig.bg} ${statusConfig.text} flex items-center justify-center mr-3`}>
                {statusConfig.icon}
              </div>
              <div>
                <p className={`font-bold ${statusConfig.text}`}>{statusConfig.label}</p>
                <p className="text-sm text-slate-500">Dernière mise à jour: {new Date(ticket.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Ticket Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">Dossier {ticket.id}</h1>
              <p className="text-slate-500 flex items-center">
                <Building2 className="w-4 h-4 mr-2" />
                {ticket.companyName}
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
              {ticket.issueType}
            </span>
          </div>

          {/* SLA Progress */}
          {slaProgress && (
            <div className={`p-4 rounded-xl ${slaProgress.isBreached ? 'bg-red-50' : slaProgress.isWarning ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${slaProgress.isBreached ? 'text-red-700' : slaProgress.isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
                  <Clock className="w-4 h-4 inline mr-1" />
                  {slaProgress.isBreached ? 'SLA dépassé' : `Résolution estimée dans ${slaProgress.hoursRemaining}h`}
                </span>
                <span className="text-xs text-slate-500">
                  Échéance: {new Date(ticket.slaDeadline!).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${slaProgress.isBreached ? 'bg-red-500' : slaProgress.isWarning ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${slaProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Info Quick View */}
        <div className="p-6 bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <User className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-xs text-slate-400">Contact</p>
              <p className="text-sm font-medium text-slate-700">{ticket.contactName || 'Non spécifié'}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-xs text-slate-400">Téléphone</p>
              <p className="text-sm font-medium text-slate-700">{ticket.contactPhone || 'Non spécifié'}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 mr-3" />
            <div>
              <p className="text-xs text-slate-400">RDV téléphonique</p>
              <p className="text-sm font-medium text-slate-700">{ticket.callbackSlot || 'Non planifié'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['timeline', 'messages', 'details'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'timeline' && 'Historique'}
            {tab === 'messages' && 'Messages'}
            {tab === 'details' && 'Détails'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="p-6">
            <h3 className="font-bold text-slate-800 mb-6">Suivi de votre demande</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

              {timeline.map((event, idx) => (
                <div key={event.id} className="relative pl-12 pb-8 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    event.type === 'created' ? 'bg-green-100 text-green-600' :
                    event.type === 'message' ? 'bg-blue-100 text-blue-600' :
                    event.type === 'status_change' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {event.type === 'created' && <CheckCircle className="w-4 h-4" />}
                    {event.type === 'message' && <MessageSquare className="w-4 h-4" />}
                    {event.type === 'status_change' && <RefreshCw className="w-4 h-4" />}
                    {event.type === 'attachment' && <Paperclip className="w-4 h-4" />}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-slate-800">{event.title}</h4>
                      <span className="text-xs text-slate-400">
                        {event.timestamp.toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-600">{event.description}</p>
                    )}
                    {event.user && (
                      <p className="text-xs text-slate-400 mt-2">Par {event.user}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Aucun message pour le moment</p>
                  <p className="text-sm text-slate-400">Vous recevrez une notification dès qu'un technicien répondra.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.isFromCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.isFromCustomer
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      {!msg.isFromCustomer && (
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName || 'Équipe KLY'}</p>
                      )}
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      <p className={`text-xs mt-2 ${msg.isFromCustomer ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="font-bold text-slate-800 mb-3">Description du problème</h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className={`text-slate-600 whitespace-pre-line ${!showFullDescription && 'line-clamp-4'}`}>
                  {ticket.description}
                </p>
                {ticket.description && ticket.description.length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {showFullDescription ? (
                      <>Voir moins <ChevronUp className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Voir plus <ChevronDown className="w-4 h-4 ml-1" /></>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Pièces jointes ({ticket.attachments.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ticket.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={typeof attachment === 'string' ? attachment : attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:bg-slate-100 transition-colors flex items-center"
                    >
                      {typeof attachment === 'string' ? (
                        attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <Image className="w-5 h-5 text-blue-500 mr-3" />
                        ) : attachment.match(/\.(mp4|webm|mov)$/i) ? (
                          <Film className="w-5 h-5 text-purple-500 mr-3" />
                        ) : (
                          <FileText className="w-5 h-5 text-slate-500 mr-3" />
                        )
                      ) : (
                        <FileText className="w-5 h-5 text-slate-500 mr-3" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          Fichier {idx + 1}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Products */}
            {ticket.affectedProducts && ticket.affectedProducts.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Produits concernés</h4>
                <div className="flex flex-wrap gap-2">
                  {ticket.affectedProducts.map((product, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm flex items-center">
                      <Package className="w-4 h-4 mr-2 text-slate-400" />
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {ticket.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Une question sur ce dossier ?{' '}
          <a href="tel:+33123456789" className="text-blue-600 hover:underline font-medium">
            Appelez-nous au +33 1 23 45 67 89
          </a>
        </p>
      </div>
    </div>
  );
};

export default TicketDetailAdapted;
