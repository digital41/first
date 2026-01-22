import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  CheckCheck,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Notification, NotificationType } from '@/types';
import { formatRelativeTime, formatTicketNumber, cn } from '@/utils/helpers';

type FilterType = 'all' | 'unread' | 'read';

const NOTIFICATION_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'read', label: 'Lues' }
];

const TYPE_FILTERS: { value: NotificationType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Tous types', icon: Bell },
  { value: NotificationType.MESSAGE, label: 'Messages', icon: MessageSquare },
  { value: NotificationType.TICKET_UPDATE, label: 'Mises à jour', icon: CheckCircle },
  { value: NotificationType.SLA_WARNING, label: 'Alertes SLA', icon: Clock },
  { value: NotificationType.SLA_BREACH, label: 'Violations SLA', icon: AlertCircle }
];

function NotificationItem({
  notification,
  onMarkRead
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.MESSAGE:
        return <MessageSquare className="text-blue-500" size={20} />;
      case NotificationType.TICKET_UPDATE:
        return <CheckCircle className="text-green-500" size={20} />;
      case NotificationType.SLA_WARNING:
        return <Clock className="text-orange-500" size={20} />;
      case NotificationType.SLA_BREACH:
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getTitle = () => {
    if (notification.payload?.title) return notification.payload.title;
    if (notification.title) return notification.title;

    switch (notification.type) {
      case NotificationType.MESSAGE:
        return 'Nouveau message';
      case NotificationType.TICKET_UPDATE:
        return 'Ticket mis à jour';
      case NotificationType.SLA_WARNING:
        return 'Avertissement SLA';
      case NotificationType.SLA_BREACH:
        return 'Violation SLA';
      default:
        return 'Notification';
    }
  };

  const getMessage = () => {
    if (notification.payload?.content) return notification.payload.content;
    if (notification.body) return notification.body;

    switch (notification.type) {
      case NotificationType.MESSAGE:
        return 'Nouveau message sur votre ticket';
      case NotificationType.TICKET_UPDATE:
        return 'Votre ticket a été mis à jour';
      case NotificationType.SLA_WARNING:
        return 'Le délai de réponse approche';
      case NotificationType.SLA_BREACH:
        return 'Le délai de réponse a été dépassé';
      default:
        return 'Nouvelle notification';
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case NotificationType.MESSAGE:
        return { label: 'Message', color: 'bg-blue-100 text-blue-700' };
      case NotificationType.TICKET_UPDATE:
        return { label: 'Mise à jour', color: 'bg-green-100 text-green-700' };
      case NotificationType.SLA_WARNING:
        return { label: 'Alerte SLA', color: 'bg-orange-100 text-orange-700' };
      case NotificationType.SLA_BREACH:
        return { label: 'Violation SLA', color: 'bg-red-100 text-red-700' };
      default:
        return { label: 'Info', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const typeInfo = getTypeLabel();

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead();
    }
  };

  const ticketLink = notification.ticketId ? `/tickets/${notification.ticketId}` : '#';

  return (
    <Link
      to={ticketLink}
      onClick={handleClick}
      className={cn(
        'block p-4 sm:p-5 hover:bg-gray-50 transition-colors border-l-4',
        notification.isRead
          ? 'border-transparent bg-white'
          : 'border-primary-500 bg-primary-50/50'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={cn(
          'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0',
          notification.isRead ? 'bg-gray-100' : 'bg-white shadow-sm'
        )}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-sm sm:text-base line-clamp-1',
              notification.isRead ? 'text-gray-700' : 'text-gray-900'
            )}>
              {getTitle()}
            </h3>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shrink-0',
              typeInfo.color
            )}>
              {typeInfo.label}
            </span>
          </div>

          <p className={cn(
            'text-sm line-clamp-2',
            notification.isRead ? 'text-gray-500' : 'text-gray-700'
          )}>
            {getMessage()}
          </p>

          {notification.ticket && (
            <div className="flex items-center mt-2 text-xs text-gray-400">
              <Inbox size={12} className="mr-1.5" />
              <span className="truncate">
                {formatTicketNumber(notification.ticket.ticketNumber)} - {notification.ticket.title}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatRelativeTime(notification.createdAt)}
            </span>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-primary-500 rounded-full" title="Non lu" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotificationContext();

  const [filter, setFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Filter by read status
      if (filter === 'unread' && notification.isRead) return false;
      if (filter === 'read' && !notification.isRead) return false;

      // Filter by type
      if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

      return true;
    });
  }, [notifications, filter, typeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="space-y-4 sm:space-y-6 fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-xl sm:text-2xl mb-1">Notifications</h1>
          <p className="page-subtitle text-sm sm:text-base">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Toutes vos notifications sont lues'
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <CheckCheck size={16} className="mr-1.5" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lu</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Read status filter */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={14} className="text-gray-500" />
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {NOTIFICATION_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    filter === f.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={14} className="text-gray-500" />
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={cn(
                    'flex items-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                    typeFilter === f.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <f.icon size={12} className="mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">{f.label}</span>
                  <span className="sm:hidden">
                    {f.value === 'all' ? 'Tous' : f.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-4">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="text-gray-400" size={28} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Aucune notification</h3>
            <p className="text-sm text-gray-500">
              {filter === 'unread'
                ? 'Vous avez lu toutes vos notifications.'
                : filter === 'read'
                ? 'Aucune notification lue.'
                : 'Vous n\'avez pas encore de notifications.'}
            </p>
            {(filter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setFilter('all');
                  setTypeFilter('all');
                }}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead([notification.id])}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {notifications.length > 0 && (
        <div className="text-center text-xs sm:text-sm text-gray-500">
          {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''} affichée{filteredNotifications.length > 1 ? 's' : ''}
          {(filter !== 'all' || typeFilter !== 'all') && (
            <span> sur {notifications.length} au total</span>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
