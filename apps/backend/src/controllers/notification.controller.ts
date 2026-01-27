import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';
import {
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '../services/notification.service.js';

// ============================================
// CONTROLLER NOTIFICATIONS
// ============================================

/**
 * GET /api/notifications
 * Liste les notifications de l'utilisateur connecté
 */
export async function getNotifications(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id: userId } = req.user;
    const { unreadOnly = 'false', page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { userId };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      getUnreadCount(userId),
    ]);

    // Enrichir les notifications avec ticketNumber et ticketTitle depuis le payload
    const enrichedNotifications = notifications.map(n => ({
      ...n,
      ticketNumber: (n.payload as Record<string, unknown>)?.ticketNumber,
      ticketTitle: (n.payload as Record<string, unknown>)?.ticketTitle,
    }));

    res.json({
      success: true,
      data: enrichedNotifications,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        unreadCount,
      },
    });
  } catch (error) {
    console.error('[Get Notifications Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.name : undefined
    });
  }
}

/**
 * GET /api/notifications/unread-count
 * Nombre de notifications non lues
 */
export async function getUnreadNotificationCount(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id: userId } = req.user;
    const count = await getUnreadCount(userId);

    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('[Get Unread Count Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * PUT /api/notifications/read
 * Marquer des notifications comme lues
 */
export async function markAsRead(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id: userId } = req.user;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'notificationIds requis (tableau)',
      });
      return;
    }

    const count = await markNotificationsAsRead(notificationIds, userId);

    res.json({
      success: true,
      message: `${count} notification(s) marquée(s) comme lue(s)`,
    });
  } catch (error) {
    console.error('[Mark As Read Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * PUT /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
export async function markAllAsRead(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id: userId } = req.user;
    const count = await markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: `${count} notification(s) marquée(s) comme lue(s)`,
    });
  } catch (error) {
    console.error('[Mark All As Read Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
export async function deleteNotification(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { id: userId } = req.user;

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification non trouvée' });
      return;
    }

    if (notification.userId !== userId) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ success: true, message: 'Notification supprimée' });
  } catch (error) {
    console.error('[Delete Notification Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}
