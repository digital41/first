import React from 'react';
import {
  Clock,
  AlertTriangle,
  User,
  MessageSquare,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Ticket, TicketPriority } from '../../types';
import { calculateSLAScore } from '../../lib/queueHelpers';
import SLACountdown from '../SLACountdown';

// ============================================
// QUEUE ITEM COMPONENT
// ============================================
// Compact ticket item for the operator queue

interface QueueItemProps {
  ticket: Ticket;
  isActive?: boolean;
  isCompact?: boolean;
  onClick?: (ticket: Ticket) => void;
}

const QueueItem: React.FC<QueueItemProps> = ({
  ticket,
  isActive = false,
  isCompact = false,
  onClick,
}) => {
  const slaScore = calculateSLAScore(ticket);
  const isUrgent = slaScore >= 150 || ticket.priority === 'URGENT';
  const isWarning = slaScore >= 100 && slaScore < 150;

  const getPriorityIcon = (priority: TicketPriority) => {
    if (priority === 'URGENT') {
      return <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />;
    }
    if (priority === 'HIGH') {
      return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
    }
    return null;
  };

  const getPriorityColor = (priority: TicketPriority) => {
    const colors: Record<TicketPriority, string> = {
      URGENT: 'border-l-red-500',
      HIGH: 'border-l-orange-500',
      MEDIUM: 'border-l-blue-500',
      LOW: 'border-l-slate-300',
    };
    return colors[priority];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      WAITING_CUSTOMER: 'bg-purple-100 text-purple-700',
      ESCALATED: 'bg-red-100 text-red-700',
      RESOLVED: 'bg-green-100 text-green-700',
      REOPENED: 'bg-orange-100 text-orange-700',
    };
    return styles[status] || 'bg-slate-100 text-slate-600';
  };

  // Calculate time since creation
  const getTimeAgo = () => {
    const now = new Date().getTime();
    const created = new Date(ticket.createdAt).getTime();
    const hours = Math.floor((now - created) / (1000 * 60 * 60));

    if (hours < 1) return 'Moins d\'1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}j`;
  };

  if (isCompact) {
    return (
      <button
        onClick={() => onClick?.(ticket)}
        className={`
          w-full text-left p-3 rounded-lg border-l-4 transition-all duration-200
          ${getPriorityColor(ticket.priority)}
          ${isActive
            ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
            : 'bg-white hover:bg-slate-50 border border-slate-100'
          }
          ${isUrgent ? 'animate-pulse-subtle' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {getPriorityIcon(ticket.priority)}
            <span className="font-medium text-slate-800 truncate text-sm">
              {ticket.title}
            </span>
          </div>
          <SLACountdown deadline={ticket.slaDeadline} breached={ticket.slaBreached} />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(ticket)}
      className={`
        w-full text-left p-4 rounded-xl border-l-4 transition-all duration-200 group
        ${getPriorityColor(ticket.priority)}
        ${isActive
          ? 'bg-indigo-50 border border-indigo-200 shadow-md ring-2 ring-indigo-500/20'
          : 'bg-white hover:bg-slate-50 border border-slate-200 hover:shadow-md'
        }
        ${isUrgent ? 'ring-2 ring-red-200' : ''}
        ${isWarning ? 'ring-1 ring-yellow-200' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {getPriorityIcon(ticket.priority)}
          <h4 className="font-medium text-slate-800 truncate">
            {ticket.title}
          </h4>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 ml-2" />
      </div>

      {/* Ticket ID & Status */}
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-xs text-slate-500">#{ticket.id.slice(0, 8)}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      {/* Client info */}
      <div className="flex items-center space-x-2 text-sm text-slate-600 mb-3">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate">
          {ticket.customer?.displayName || ticket.contactName || 'Client inconnu'}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        {/* SLA */}
        <SLACountdown deadline={ticket.slaDeadline} breached={ticket.slaBreached} />

        {/* Meta */}
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          {ticket._count?.messages !== undefined && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{ticket._count.messages}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{getTimeAgo()}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default QueueItem;
