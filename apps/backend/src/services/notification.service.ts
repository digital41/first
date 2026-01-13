import { prisma } from '../config/database.js';
import { sendNotificationToUser } from '../websocket/index.js';
import type { NotificationType } from '@prisma/client';

// ============================================
// SERVICE NOTIFICATIONS
// ============================================

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  ticketId?: string;
  messageId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Crée une notification et l'envoie en temps réel via WebSocket
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  const { userId, type, ticketId, messageId, payload } = params;

  try {
    // Créer en base de données
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        ticketId,
        messageId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      },
    });

    // Extraire title et body du payload pour WebSocket
    const title = (payload?.title as string) || type;
    const body = (payload?.content as string) || '';

    // Envoyer via WebSocket
    sendNotificationToUser(userId, {
      id: notification.id,
      type: notification.type,
      title,
      body,
      ticketId: notification.ticketId ?? undefined,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Notification Service] Erreur création:', error);
  }
}

/**
 * Notifie l'assignation d'un ticket
 */
export async function notifyTicketAssigned(
  ticketId: string,
  agentId: string,
  ticketTitle: string
): Promise<void> {
  await createNotification({
    userId: agentId,
    type: 'TICKET_UPDATE',
    ticketId,
    payload: {
      action: 'assigned',
      title: 'Nouveau ticket assigné',
      content: `Le ticket "${ticketTitle}" vous a été assigné.`,
    },
  });
}

/**
 * Notifie un nouveau message sur un ticket
 */
export async function notifyNewMessage(
  ticketId: string,
  messageId: string,
  recipientId: string,
  senderName: string,
  ticketTitle: string
): Promise<void> {
  await createNotification({
    userId: recipientId,
    type: 'MESSAGE',
    ticketId,
    messageId,
    payload: {
      title: 'Nouveau message',
      content: `${senderName} a envoyé un message sur "${ticketTitle}".`,
      senderName,
    },
  });
}

/**
 * Notifie une mention
 */
export async function notifyMention(
  ticketId: string,
  messageId: string,
  mentionedUserId: string,
  senderName: string,
  ticketTitle: string
): Promise<void> {
  await createNotification({
    userId: mentionedUserId,
    type: 'MENTION',
    ticketId,
    messageId,
    payload: {
      title: 'Vous avez été mentionné',
      content: `${senderName} vous a mentionné dans "${ticketTitle}".`,
      senderName,
    },
  });
}

/**
 * Notifie le changement de statut d'un ticket
 */
export async function notifyStatusChange(
  ticketId: string,
  recipientId: string,
  newStatus: string,
  ticketTitle: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    OPEN: 'Ouvert',
    IN_PROGRESS: 'En cours',
    WAITING_CUSTOMER: 'En attente client',
    RESOLVED: 'Résolu',
    CLOSED: 'Fermé',
    ESCALATED: 'Escaladé',
    REOPENED: 'Réouvert',
  };

  await createNotification({
    userId: recipientId,
    type: 'TICKET_UPDATE',
    ticketId,
    payload: {
      action: 'status_changed',
      title: 'Statut mis à jour',
      content: `Le ticket "${ticketTitle}" est maintenant: ${statusLabels[newStatus] || newStatus}.`,
      newStatus,
    },
  });
}

/**
 * Notifie un avertissement SLA (ticket proche de la deadline)
 */
export async function notifySlaWarning(
  ticketId: string,
  agentId: string,
  ticketTitle: string,
  hoursRemaining: number
): Promise<void> {
  await createNotification({
    userId: agentId,
    type: 'SLA_WARNING',
    ticketId,
    payload: {
      title: 'Avertissement SLA',
      content: `Le ticket "${ticketTitle}" doit être traité dans ${hoursRemaining}h.`,
      hoursRemaining,
    },
  });
}

/**
 * Notifie une violation SLA
 */
export async function notifySlaBreach(
  ticketId: string,
  agentId: string,
  ticketTitle: string
): Promise<void> {
  await createNotification({
    userId: agentId,
    type: 'SLA_BREACH',
    ticketId,
    payload: {
      title: 'Violation SLA',
      content: `Le ticket "${ticketTitle}" a dépassé le délai SLA.`,
    },
  });
}

/**
 * Marque les notifications comme lues
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
  userId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId, // S'assurer que l'utilisateur est propriétaire
    },
    data: {
      isRead: true,
    },
  });

  return result.count;
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return result.count;
}

/**
 * Récupère les notifications non lues d'un utilisateur
 */
export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
      isRead: false,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Récupère le nombre de notifications non lues
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
