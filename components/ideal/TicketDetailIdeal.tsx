import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MessageCircle,
  Send,
  Phone,
  Calendar,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Paperclip
} from 'lucide-react';
import { Ticket, TicketStatus, TicketMessage } from '../../types';
import { ApiService } from '../../services/api';

/**
 * IDEAL TICKET DETAIL VIEW
 *
 * Design Philosophy:
 * - Progress-focused: Show a clear journey from problem to resolution
 * - Conversation-style: Messages feel like a natural chat
 * - Always show what's next: The client never wonders what to do
 * - Celebrate progress: Make each step feel like an achievement
 */

interface TicketDetailIdealProps {
  ticket: Ticket;
  onBack: () => void;
}

// Journey steps for the progress visualization
const JOURNEY_STEPS = [
  { id: 'created', label: 'Demande reçue', icon: CheckCircle },
  { id: 'assigned', label: 'Prise en charge', icon: Clock },
  { id: 'in_progress', label: 'En cours', icon: Clock },
  { id: 'resolved', label: 'Résolu', icon: CheckCircle },
];

const TicketDetailIdeal: React.FC<TicketDetailIdealProps> = ({ ticket, onBack }) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
    setSending(true);
    try {
      await ApiService.sendTicketMessage(ticket.id, newMessage);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setSending(false);
    }
  };

  // Calculate current progress step
  const getCurrentStep = (): number => {
    switch (ticket.status) {
      case TicketStatus.OPEN:
        return 0;
      case TicketStatus.IN_PROGRESS:
      case TicketStatus.WAITING_CUSTOMER:
      case TicketStatus.ESCALATED:
        return 2;
      case TicketStatus.RESOLVED:
      case TicketStatus.CLOSED:
        return 3;
      default:
        return 1;
    }
  };

  const currentStep = getCurrentStep();
  const needsAction = ticket.status === TicketStatus.WAITING_CUSTOMER;

  // Get contextual next step message
  const getNextStepMessage = (): { title: string; description: string } => {
    if (needsAction) {
      return {
        title: "Nous avons besoin de vous",
        description: "Merci de répondre au message ci-dessous pour que nous puissions avancer sur votre dossier."
      };
    }
    switch (ticket.status) {
      case TicketStatus.OPEN:
        return {
          title: "Votre demande est en file d'attente",
          description: "Un technicien va la prendre en charge sous peu. Vous serez notifié par email."
        };
      case TicketStatus.IN_PROGRESS:
        return {
          title: "Nous travaillons sur votre dossier",
          description: "Notre équipe analyse votre demande. Nous vous recontacterons bientôt."
        };
      case TicketStatus.RESOLVED:
        return {
          title: "Votre problème a été résolu",
          description: "N'hésitez pas à nous recontacter si vous avez d'autres questions."
        };
      default:
        return {
          title: "Nous traitons votre demande",
          description: "Vous recevrez une mise à jour prochainement."
        };
    }
  };

  const nextStep = getNextStepMessage();

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour à l'accueil
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-sm text-slate-400 mb-2">Dossier {ticket.id}</div>
          <h1 className="text-3xl font-bold text-slate-800">Suivi de votre demande</h1>
        </div>

        {/* Progress Journey */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            {JOURNEY_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStep;
              const isCurrent = idx === currentStep;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? isCurrent
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                          : 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isCompleted && idx < currentStep ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < JOURNEY_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${
                      idx < currentStep ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Action Required Banner */}
          {needsAction && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-6 flex items-start">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold text-purple-900 mb-1">{nextStep.title}</h4>
                <p className="text-sm text-purple-700">{nextStep.description}</p>
              </div>
            </div>
          )}

          {/* Next Step Message */}
          {!needsAction && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">{nextStep.title}</h4>
                <p className="text-sm text-blue-700">{nextStep.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
              Échanges
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-2">Pas encore de messages</p>
                <p className="text-sm text-slate-400">Vous recevrez une notification dès qu'un technicien répondra.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.isFromCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${
                    msg.isFromCustomer
                      ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'
                  } p-4`}>
                    {!msg.isFromCustomer && (
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">K</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {msg.senderName || 'Équipe KLY'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.isFromCustomer ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6 py-4 bg-blue-500 text-white rounded-2xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-slate-700">Détails du dossier</span>
            {showDetails ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showDetails && (
            <div className="p-6 pt-0 border-t border-slate-100 animate-fade-in">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Contact</p>
                  <p className="text-sm font-medium text-slate-700">{ticket.contactName || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Entreprise</p>
                  <p className="text-sm font-medium text-slate-700">{ticket.companyName || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Date d'ouverture</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">RDV téléphonique</p>
                  <p className="text-sm font-medium text-slate-700">{ticket.callbackSlot || 'Non planifié'}</p>
                </div>
              </div>

              {ticket.description && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Description</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl whitespace-pre-line">
                    {ticket.description}
                  </p>
                </div>
              )}

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-400 mb-2">Pièces jointes</p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((_, idx) => (
                      <div key={idx} className="flex items-center px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                        <Paperclip className="w-4 h-4 mr-2 text-slate-400" />
                        Fichier {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Une question sur ce dossier ?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a
              href="tel:+33123456789"
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              <Phone className="w-4 h-4 mr-2" />
              Appeler
            </a>
            <a
              href="mailto:support@klygroupe.com"
              className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailIdeal;
