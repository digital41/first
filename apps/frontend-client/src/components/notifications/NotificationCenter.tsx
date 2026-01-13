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
import { useNotifications } from '@/hooks/useNotifications';
import { Notification, NotificationType } from '@/types';
import { formatRelativeTime, cn } from '@/utils/helpers';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
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

  const getMessage = () => {
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

  return (
    <Link
      to={getLink()}
      onClick={onMarkRead}
      className={cn(
        'flex items-start p-4 hover:bg-gray-50 transition-colors border-l-4',
        notification.isRead
          ? 'border-transparent bg-white'
          : 'border-primary-500 bg-primary-50'
      )}
    >
      <div className="shrink-0 mr-3 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', notification.isRead ? 'text-gray-700' : 'font-medium text-gray-900')}>
          {getMessage()}
        </p>
        {notification.ticket && (
          <p className="text-sm text-gray-500 truncate mt-0.5">
            #{notification.ticket.ticketNumber} - {notification.ticket.title}
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
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-16 right-4 w-96 max-h-[calc(100vh-5rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col slide-in-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <Bell className="text-gray-500 mr-2" size={18} />
            <h2 className="font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-sm text-primary-600 hover:text-primary-700 mr-2"
              >
                Tout marquer lu
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500">Aucune notification</p>
              <p className="text-sm text-gray-400 mt-1">
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
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 shrink-0">
            <Link
              to="/notifications"
              onClick={onClose}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
