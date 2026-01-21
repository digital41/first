import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Notification, NotificationType } from '@/types';
import { formatRelativeTime, formatTicketNumber, cn } from '@/utils/helpers';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onClick: () => void;
}

function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.MESSAGE:
        return <MessageSquare className="text-blue-500" size={18} />;
      case NotificationType.TICKET_UPDATE:
        return <CheckCircle className="text-green-500" size={18} />;
      case NotificationType.SLA_WARNING:
        return <Clock className="text-orange-500" size={18} />;
      case NotificationType.SLA_BREACH:
        return <AlertCircle className="text-red-500" size={18} />;
      default:
        return <Bell className="text-gray-500" size={18} />;
    }
  };

  const getTitle = () => {
    // Utiliser le titre du payload ou direct si disponible
    if (notification.payload?.title) return notification.payload.title;
    if (notification.title) return notification.title;

    // Fallback basé sur le type
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
    // Utiliser le contenu du payload ou body si disponible
    if (notification.payload?.content) return notification.payload.content;
    if (notification.body) return notification.body;

    // Fallback basé sur le type
    switch (notification.type) {
      case NotificationType.MESSAGE:
        return 'Nouveau message sur votre ticket';
      case NotificationType.TICKET_UPDATE:
        return 'Votre ticket a été mis à jour';
      case NotificationType.SLA_WARNING:
        return 'Délai de réponse bientôt dépassé';
      case NotificationType.SLA_BREACH:
        return 'Le délai de réponse est dépassé';
      default:
        return 'Nouvelle notification';
    }
  };

  const getLink = () => {
    if (notification.ticketId) {
      return `/tickets/${notification.ticketId}`;
    }
    return '#';
  };

  const handleClick = () => {
    onMarkRead();
    onClick();
  };

  return (
    <Link
      to={getLink()}
      onClick={handleClick}
      className={cn(
        'flex items-start p-3 sm:p-4 hover:bg-gray-50 transition-colors border-l-4',
        notification.isRead
          ? 'border-transparent bg-white'
          : 'border-primary-500 bg-primary-50'
      )}
    >
      <div className="shrink-0 mr-2 sm:mr-3 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium line-clamp-1', notification.isRead ? 'text-gray-700' : 'text-gray-900')}>
          {getTitle()}
        </p>
        <p className={cn('text-xs sm:text-sm mt-0.5 line-clamp-2', notification.isRead ? 'text-gray-500' : 'text-gray-600')}>
          {getMessage()}
        </p>
        {notification.ticket && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {formatTicketNumber(notification.ticket.ticketNumber)} - {notification.ticket.title}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </Link>
  );
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotificationContext();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel - Responsive: full width on mobile, fixed width on desktop */}
      <div className="fixed top-14 sm:top-16 left-2 right-2 sm:left-auto sm:right-4 sm:w-96 max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col slide-in-right">
        {/* Header */}
        <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center min-w-0">
            <Bell className="text-gray-500 mr-2 shrink-0" size={18} />
            <h2 className="font-semibold text-gray-900 truncate">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center shrink-0 ml-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 mr-2 whitespace-nowrap"
              >
                Tout lu
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <Bell className="mx-auto text-gray-300 mb-3" size={36} />
              <p className="text-gray-500 text-sm sm:text-base">Aucune notification</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Vous serez notifié des mises à jour de vos tickets
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => {
                    if (!notification.isRead) {
                      markAsRead([notification.id]);
                    }
                  }}
                  onClick={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 sm:px-4 py-3 border-t border-gray-200 shrink-0 bg-gray-50">
            <Link
              to="/notifications"
              onClick={onClose}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium block text-center sm:text-left"
            >
              Voir toutes les notifications
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationCenter;
