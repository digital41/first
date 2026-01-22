import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Notification } from '@/types';
import { notificationsApi } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  unreadByTicket: Map<string, number>;
  hasUnreadForTicket: (ticketId: string) => boolean;
  getUnreadCountForTicket: (ticketId: string) => number;
  markTicketNotificationsAsRead: (ticketId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);
      const [notifs, count] = await Promise.all([
        notificationsApi.getAll(),
        notificationsApi.getUnreadCount(),
      ]);
      // Dédupliquer les notifications par ID
      const uniqueNotifs = notifs.reduce((acc: Notification[], n: Notification) => {
        if (!acc.some(existing => existing.id === n.id)) {
          acc.push(n);
        }
        return acc;
      }, []);
      // Mettre à jour les IDs connus
      seenIdsRef.current = new Set(uniqueNotifs.map((n: Notification) => n.id));
      setNotifications(uniqueNotifs);
      setUnreadCount(count);
    } catch (err) {
      setError('Erreur lors du chargement des notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time updates
  useEffect(() => {
    const handleNewNotification = (data: unknown) => {
      // Le backend envoie: { id, type, title, body, ticketId, createdAt }
      const incoming = data as Record<string, unknown>;
      const notifId = incoming.id as string;

      // Éviter les doublons via le ref
      if (seenIdsRef.current.has(notifId)) {
        console.log('[Notification] Doublon ignoré:', notifId);
        return;
      }

      console.log('[Notification] Nouvelle notification reçue:', notifId);
      seenIdsRef.current.add(notifId);

      // Construire l'objet Notification avec isRead = false
      const notif: Notification = {
        id: notifId,
        type: incoming.type as Notification['type'],
        ticketId: incoming.ticketId as string | undefined,
        title: incoming.title as string | undefined,
        body: incoming.body as string | undefined,
        isRead: false,
        createdAt: incoming.createdAt as string || new Date().toISOString(),
      };

      setNotifications((prev) => {
        // Double-vérification pour éviter les doublons
        if (prev.some(n => n.id === notifId)) {
          return prev;
        }
        return [notif, ...prev];
      });
      setUnreadCount((count) => count + 1);
    };

    // Le backend émet 'notification' (pas 'notification:new')
    socketService.on('notification', handleNewNotification);

    return () => {
      socketService.off('notification', handleNewNotification);
    };
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    try {
      await notificationsApi.markAsRead(ids);
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Computed: map of ticketId -> unread count
  const unreadByTicket = useMemo(() => {
    const map = new Map<string, number>();
    notifications
      .filter((n) => !n.isRead && n.ticketId)
      .forEach((n) => {
        const current = map.get(n.ticketId!) || 0;
        map.set(n.ticketId!, current + 1);
      });
    return map;
  }, [notifications]);

  const hasUnreadForTicket = useCallback(
    (ticketId: string) => unreadByTicket.has(ticketId),
    [unreadByTicket]
  );

  const getUnreadCountForTicket = useCallback(
    (ticketId: string) => unreadByTicket.get(ticketId) || 0,
    [unreadByTicket]
  );

  const markTicketNotificationsAsRead = useCallback(
    async (ticketId: string) => {
      const ticketNotifIds = notifications
        .filter((n) => !n.isRead && n.ticketId === ticketId)
        .map((n) => n.id);
      if (ticketNotifIds.length > 0) {
        await markAsRead(ticketNotifIds);
      }
    },
    [notifications, markAsRead]
  );

  return {
    notifications,
    unreadCount,
    unreadByTicket,
    hasUnreadForTicket,
    getUnreadCountForTicket,
    markTicketNotificationsAsRead,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

export default useNotifications;
