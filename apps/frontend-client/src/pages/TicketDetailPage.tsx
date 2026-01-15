import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Clock,
  User,
  Package,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Download,
  X,
  History
} from 'lucide-react';
import { ticketsApi, messagesApi, uploadApi } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContext } from '@/contexts/NotificationContext';
import {
  Ticket,
  TicketMessage,
  TicketHistory,
  TicketStatus,
  HistoryAction,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ISSUE_TYPE_LABELS
} from '@/types';
import { StatusBadge, PriorityBadge, IssueTypeBadge, PageLoading, SLABadge } from '@/components/common';
import { formatDateTime, formatMessageTime, formatRelativeTime, formatFileSize, formatTicketNumber, cn, getInitials } from '@/utils/helpers';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { markTicketNotificationsAsRead } = useNotificationContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showSuccess, setShowSuccess] = useState(location.state?.created);
  const [isAITyping, setIsAITyping] = useState(false);
  const [showHumanHelpButton, setShowHumanHelpButton] = useState(false);

  // Fetch ticket and messages
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const [ticketData, messagesData] = await Promise.all([
          ticketsApi.getById(id),
          messagesApi.getByTicketId(id),
        ]);
        setTicket(ticketData);
        setMessages((messagesData || []).filter(m => !m.isInternal)); // Only show public messages
      } catch (error) {
        console.error('Error fetching ticket:', error);
        navigate('/tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Mark ticket notifications as read when entering the page
  useEffect(() => {
    if (id && ticket) {
      markTicketNotificationsAsRead(id);
    }
  }, [id, ticket, markTicketNotificationsAsRead]);

  // Real-time updates
  useEffect(() => {
    if (!id) return;

    console.log(`[TicketDetail] Setting up WebSocket for ticket ${id}`);
    socketService.joinTicketRoom(id);

    const handleNewMessage = (message: unknown) => {
      console.log('[TicketDetail] Received message:new event:', message);
      const msg = message as TicketMessage & { offerHumanHelp?: boolean; isAI?: boolean };
      if (!msg.isInternal) {
        // Éviter les doublons - vérifier si le message existe déjà
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) {
            console.log('[TicketDetail] Message already exists, skipping:', msg.id);
            return prev;
          }
          return [...prev, msg];
        });
        // Afficher le bouton "Parler à un humain" si l'IA le propose
        if (msg.isAI && msg.offerHumanHelp) {
          setShowHumanHelpButton(true);
        }
      }
    };

    const handleTicketUpdate = (updatedTicket: unknown) => {
      console.log('[TicketDetail] Received ticket:updated event:', updatedTicket);
      setTicket(updatedTicket as Ticket);
    };

    const handleAITyping = (data: unknown) => {
      console.log('[TicketDetail] Received ai:typing event:', data);
      const typingData = data as { ticketId: string; isTyping: boolean };
      if (typingData.ticketId === id) {
        setIsAITyping(typingData.isTyping);
      }
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('ticket:updated', handleTicketUpdate);
    socketService.on('ai:typing', handleAITyping);

    return () => {
      socketService.leaveTicketRoom(id);
      socketService.off('message:new', handleNewMessage);
      socketService.off('ticket:updated', handleTicketUpdate);
      socketService.off('ai:typing', handleAITyping);
    };
  }, [id]);

  // Scroll to bottom when new messages arrive or AI is typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAITyping]);

  // Clear success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && files.length === 0) return;
    if (!id) return;

    setIsSending(true);
    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const uploaded = await uploadApi.upload(files);
        attachmentIds = uploaded.map((a) => a.id);
      }

      const message = await messagesApi.send(id, {
        content: newMessage,
        attachments: attachmentIds,
      });

      // Ajouter le message avec vérification des doublons
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      setNewMessage('');
      setFiles([]);
      setShowHumanHelpButton(false); // Cacher le bouton après envoi d'un message
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestHumanHelp = async () => {
    if (!id) return;
    setIsSending(true);
    try {
      // Envoyer un message demandant un agent humain
      const message = await messagesApi.send(id, {
        content: "Je souhaite parler à un conseiller humain.",
        attachments: [],
      });
      // Ajouter le message avec vérification des doublons
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      setShowHumanHelpButton(false);
    } catch (error) {
      console.error('Error requesting human help:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleReopen = async () => {
    if (!id || !ticket) return;
    try {
      const updated = await ticketsApi.reopen(id);
      setTicket(updated);
    } catch (error) {
      console.error('Error reopening ticket:', error);
    }
  };

  const getHistoryActionLabel = (action: HistoryAction, field?: string, newValue?: string): string => {
    switch (action) {
      case HistoryAction.CREATED:
        return 'Ticket créé';
      case HistoryAction.STATUS_CHANGED:
        return `Statut changé vers "${STATUS_LABELS[newValue as TicketStatus] || newValue}"`;
      case HistoryAction.PRIORITY_CHANGED:
        return `Priorité changée vers "${PRIORITY_LABELS[newValue as keyof typeof PRIORITY_LABELS] || newValue}"`;
      case HistoryAction.ASSIGNED:
        return newValue ? 'Ticket assigné à un agent' : 'Ticket désassigné';
      case HistoryAction.ESCALATED:
        return 'Ticket escaladé';
      case HistoryAction.RESOLVED:
        return 'Ticket résolu';
      case HistoryAction.CLOSED:
        return 'Ticket fermé';
      case HistoryAction.REOPENED:
        return 'Ticket réouvert';
      default:
        return 'Mise à jour du ticket';
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!ticket) {
    return null;
  }

  const isResolved = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;
  const needsResponse = ticket.status === TicketStatus.WAITING_CUSTOMER;

  return (
    <div className="h-full flex flex-col fade-in">
      {/* Success message */}
      {showSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="text-green-500 shrink-0" size={20} />
          <p className="ml-2 text-green-700">
            Votre ticket a été créé avec succès. Notre équipe vous répondra dans les plus brefs délais.
          </p>
          <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-500 hover:text-green-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} className="mr-1" />
          Retour aux tickets
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-primary-600">
                {formatTicketNumber(ticket.ticketNumber)}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.slaDeadline && (
                <SLABadge deadline={ticket.slaDeadline} isBreached={ticket.slaBreached} />
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn('btn-outline btn-sm', showHistory && 'bg-gray-100')}
            >
              <History size={16} className="mr-1" />
              Historique
            </button>
            {isResolved && (
              <button onClick={handleReopen} className="btn-outline btn-sm">
                <RefreshCw size={16} className="mr-1" />
                Réouvrir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Needs response alert */}
      {needsResponse && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start">
          <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div className="ml-3">
            <p className="font-medium text-orange-800">Réponse attendue</p>
            <p className="text-sm text-orange-700 mt-1">
              Notre équipe attend votre réponse pour continuer le traitement de votre demande.
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col card">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial ticket description */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {getInitials(ticket.customer?.displayName || 'Client')}
                    </span>
                  </div>
                  <span className="ml-2 font-medium text-gray-900">Vous</span>
                </div>
                <span className="text-xs text-gray-500">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ticket.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2 bg-white rounded border border-gray-200 hover:border-primary-500"
                    >
                      <FileText size={16} className="text-gray-400" />
                      <span className="ml-2 text-sm text-gray-700">{attachment.fileName}</span>
                      <Download size={14} className="ml-2 text-gray-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            {messages.map((message) => {
              const isOwnMessage = message.authorId === user?.id;
              const isAIMessage = message.author?.displayName?.includes('IA') ||
                                  message.authorName?.includes('IA') ||
                                  (message as unknown as { isAI?: boolean }).isAI;
              return (
                <div
                  key={message.id}
                  className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[80%] p-4 rounded-lg',
                      isOwnMessage
                        ? 'bg-primary-600 text-white'
                        : isAIMessage
                        ? 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {isAIMessage ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white text-[10px] font-bold">IA</span>
                          </div>
                          <span className="text-sm font-medium text-blue-700">Assistant IA KLY</span>
                        </div>
                      ) : (
                        <span className={cn('text-sm font-medium', isOwnMessage ? 'text-primary-100' : 'text-gray-600')}>
                          {isOwnMessage ? 'Vous' : message.author?.displayName || 'Agent'}
                        </span>
                      )}
                      <span className={cn('text-xs ml-4', isOwnMessage ? 'text-primary-200' : 'text-gray-500')}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex items-center p-2 rounded',
                              isOwnMessage ? 'bg-primary-500 hover:bg-primary-400' : 'bg-white hover:bg-gray-50'
                            )}
                          >
                            <FileText size={14} />
                            <span className="ml-1 text-sm truncate">{attachment.fileName}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isAITyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-4 rounded-lg bg-gray-100">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs font-bold">IA</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">Assistant IA KLY</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-sm text-gray-500 ml-2">est en train d'écrire...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Human Help Button */}
            {showHumanHelpButton && !isAITyping && (
              <div className="flex justify-center my-4">
                <button
                  onClick={handleRequestHumanHelp}
                  disabled={isSending}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <User size={18} />
                  Parler à un conseiller humain
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {!isResolved && (
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              {files.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center bg-gray-100 rounded px-2 py-1">
                      <FileText size={14} className="text-gray-500" />
                      <span className="ml-1 text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="input min-h-[80px] resize-none"
                    disabled={isSending}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="btn-outline btn-sm cursor-pointer">
                    <Paperclip size={18} />
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
                        }
                      }}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSending || (!newMessage.trim() && files.length === 0)}
                    className="btn-primary btn-sm"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Closed ticket notice */}
          {isResolved && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-gray-600">
                Ce ticket est {ticket.status === TicketStatus.RESOLVED ? 'résolu' : 'fermé'}.
              </p>
              <button onClick={handleReopen} className="text-primary-600 hover:text-primary-700 font-medium mt-1">
                Réouvrir le ticket
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Ticket info & History */}
        <div className={cn('w-80 shrink-0 space-y-4 hidden lg:block', showHistory && 'block')}>
          {/* Ticket info */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informations</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase">Type</dt>
                <dd className="mt-1">
                  <IssueTypeBadge issueType={ticket.issueType} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Créé le</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(ticket.createdAt)}</dd>
              </div>
              {ticket.order && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Commande</dt>
                  <dd className="mt-1">
                    <Link
                      to={`/orders/${ticket.order.id}`}
                      className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Package size={14} className="mr-1" />
                      {ticket.order.orderNumber}
                    </Link>
                  </dd>
                </div>
              )}
              {ticket.assignedTo && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Agent assigné</dt>
                  <dd className="mt-1 flex items-center">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                      <User size={12} className="text-gray-500" />
                    </div>
                    <span className="text-sm text-gray-900">{ticket.assignedTo.displayName}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Documents */}
          {(() => {
            // Collect all attachments from ticket and messages
            const allAttachments = [
              ...(ticket.attachments || []),
              ...messages.flatMap(m => m.attachments || [])
            ];

            if (allAttachments.length > 0) {
              return (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText size={16} className="mr-2 text-gray-500" />
                    Documents ({allAttachments.length})
                  </h3>
                  <div className="space-y-2">
                    {allAttachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-gray-200">
                          <FileText size={16} className="text-gray-400" />
                        </div>
                        <div className="ml-2 flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{attachment.fileName}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.sizeBytes)}</p>
                        </div>
                        <Download size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* History */}
          {showHistory && ticket.history && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Historique</h3>
              <div className="space-y-3">
                {ticket.history.map((entry) => (
                  <div key={entry.id} className="flex items-start">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 mr-3 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {getHistoryActionLabel(entry.action, entry.field, entry.newValue)}
                      </p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
