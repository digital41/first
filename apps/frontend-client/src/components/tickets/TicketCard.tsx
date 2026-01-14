import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MessageSquare, Paperclip, Bell } from 'lucide-react';
import { Ticket } from '@/types';
import { StatusBadge, PriorityBadge, IssueTypeBadge } from '@/components/common';
import { formatRelativeTime, formatTicketNumber, cn } from '@/utils/helpers';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface TicketCardProps {
  ticket: Ticket;
  variant?: 'default' | 'compact';
}

export function TicketCard({ ticket, variant = 'default' }: TicketCardProps) {
  const { getUnreadCountForTicket } = useNotificationContext();
  const unreadCount = getUnreadCountForTicket(ticket.id);

  if (variant === 'compact') {
    return (
      <Link
        to={`/tickets/${ticket.id}`}
        className={cn(
          'block p-3 hover:bg-gray-50 rounded-lg transition-colors relative',
          unreadCount > 0 && 'bg-primary-50/50 border-l-2 border-primary-500'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary-600">
              {formatTicketNumber(ticket.ticketNumber)}
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <StatusBadge status={ticket.status} size="sm" />
        </div>
        <p className="text-sm text-gray-900 truncate">{ticket.title}</p>
        <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(ticket.createdAt)}</p>
      </Link>
    );
  }

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={cn(
        'block card p-4 hover:shadow-md transition-shadow',
        unreadCount > 0 && 'ring-2 ring-primary-500 ring-offset-1'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary-600">
              {formatTicketNumber(ticket.ticketNumber)}
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                <Bell size={10} />
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mt-1">{ticket.title}</h3>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {ticket.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} size="sm" />
          <IssueTypeBadge issueType={ticket.issueType} size="sm" />
        </div>

        <div className="flex items-center gap-3 text-gray-400">
          {ticket.messages && ticket.messages.length > 0 && (
            <span className="flex items-center text-xs">
              <MessageSquare size={14} className="mr-1" />
              {ticket.messages.length}
            </span>
          )}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <span className="flex items-center text-xs">
              <Paperclip size={14} className="mr-1" />
              {ticket.attachments.length}
            </span>
          )}
          <span className="text-xs">{formatRelativeTime(ticket.createdAt)}</span>
        </div>
      </div>

      {ticket.slaDeadline && !ticket.slaBreached && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500">
          <Clock size={12} className="mr-1" />
          Réponse attendue avant le {new Date(ticket.slaDeadline).toLocaleDateString('fr-FR')}
        </div>
      )}

      {ticket.slaBreached && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-xs text-red-600">
          <Clock size={12} className="mr-1" />
          SLA dépassé
        </div>
      )}
    </Link>
  );
}

export default TicketCard;
