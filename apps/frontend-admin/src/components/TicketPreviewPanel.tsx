import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  User,
  Clock,
  Tag,
  MessageSquare,
  Loader2,
  Send,
} from 'lucide-react';
import { Ticket, TicketMessage } from '../types';
import { AdminApi } from '../services/api';
import SLACountdown from './SLACountdown';

// ============================================
// TICKET PREVIEW PANEL COMPONENT
// ============================================
// Panel latéral pour aperçu rapide d'un ticket
// Permet de voir les messages et répondre sans quitter la liste

interface TicketPreviewPanelProps {
  ticket: Ticket | null;
  onClose: () => void;
  onOpenFull: (ticket: Ticket) => void;
}

const TicketPreviewPanel: React.FC<TicketPreviewPanelProps> = ({
  ticket,
  onClose,
  onOpenFull,
}) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [quickReply, setQuickReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (ticket) {
      loadMessages();
    }
  }, [ticket?.id]);

  const loadMessages = async () => {
    if (!ticket) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await AdminApi.getTicketMessages(ticket.id);
      setMessages(Array.isArray(msgs) ? msgs.slice(-5) : []); // Last 5 messages
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !quickReply.trim() || isSending) return;

    setIsSending(true);
    try {
      const newMsg = await AdminApi.sendMessage(ticket.id, quickReply, false);
      setMessages((prev) => [...prev, newMsg]);
      setQuickReply('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!ticket) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
      RESOLVED: 'bg-green-100 text-green-700',
      CLOSED: 'bg-slate-100 text-slate-600',
      ESCALATED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-slate-800">Aperçu rapide</h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenFull(ticket)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Ouvrir en plein écran"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Ticket Info */}
          <div className="p-4 border-b border-slate-100">
            <h4 className="font-medium text-slate-800 mb-2">{ticket.title}</h4>
            <p className="text-sm text-slate-500 mb-3">#{ticket.id.slice(0, 8)}</p>

            {ticket.description && (
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-3">
                {ticket.description.slice(0, 200)}
                {ticket.description.length > 200 && '...'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Client */}
              <div className="flex items-center space-x-2 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>{ticket.customer?.displayName || ticket.contactName || '-'}</span>
              </div>

              {/* SLA */}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <SLACountdown
                  deadline={ticket.slaDeadline}
                  breached={ticket.slaBreached}
                />
              </div>

              {/* Assigné */}
              {ticket.assignedTo && (
                <div className="flex items-center space-x-2 text-slate-600 col-span-2">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                    {ticket.assignedTo.displayName?.charAt(0) || '?'}
                  </div>
                  <span>{ticket.assignedTo.displayName}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex items-center space-x-2 mt-3">
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-1">
                  {ticket.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Messages */}
          <div className="p-4">
            <h5 className="text-sm font-medium text-slate-700 mb-3 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Derniers messages</span>
            </h5>

            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Aucun message</p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.isInternal
                        ? 'bg-yellow-50 border border-yellow-100'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">
                        {msg.author?.displayName || 'Utilisateur'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Reply */}
        <form
          onSubmit={handleQuickReply}
          className="p-4 border-t border-slate-200 bg-slate-50"
        >
          <div className="flex space-x-2">
            <input
              type="text"
              value={quickReply}
              onChange={(e) => setQuickReply(e.target.value)}
              placeholder="Réponse rapide..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isSending || !quickReply.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default TicketPreviewPanel;
