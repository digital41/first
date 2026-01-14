import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { CreateTicketDto, UpdateTicketDto, PaginatedResult, PaginationParams } from '../types/index.js';
import type { Ticket, TicketStatus, TicketPriority, IssueType } from '@prisma/client';
import {
  notifyStatusChange,
  notifyTicketAssigned,
  createNotification,
} from './notification.service.js';

// ============================================
// SERVICE DE GESTION DES TICKETS
// ============================================

/**
 * Crée un nouveau ticket SAV
 */
export async function createTicket(
  data: CreateTicketDto,
  customerId?: string
): Promise<Ticket> {
  const ticket = await prisma.ticket.create({
    data: {
      customerId,
      orderId: data.orderId,
      title: data.title,
      description: data.description,
      issueType: data.issueType as IssueType,
      status: 'OPEN',
      priority: (data.priority as TicketPriority) || 'MEDIUM',
      tags: data.tags || [],
      // Champs de contact (pour création manuelle)
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      companyName: data.companyName,
    },
    include: {
      order: true,
      attachments: true,
    },
  });

  // Enregistre dans l'historique
  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket.id,
      actorId: customerId,
      action: 'CREATED',
      field: 'status',
      oldValue: null,
      newValue: 'OPEN',
    },
  });

  // Notifier les admins et superviseurs du nouveau ticket
  const staffToNotify = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPERVISOR'] },
    },
    select: { id: true },
  });

  const issueTypeLabels: Record<string, string> = {
    TECHNICAL: 'Technique',
    DELIVERY: 'Livraison',
    BILLING: 'Facturation',
    OTHER: 'Autre',
  };

  for (const staff of staffToNotify) {
    await createNotification({
      userId: staff.id,
      type: 'TICKET_UPDATE',
      ticketId: ticket.id,
      payload: {
        action: 'created',
        title: 'Nouveau ticket',
        content: `Nouveau ticket "${ticket.title}" (${issueTypeLabels[ticket.issueType] || ticket.issueType}).`,
        issueType: ticket.issueType,
        priority: ticket.priority,
      },
    });
  }

  return ticket;
}

/**
 * Récupère un ticket par ID
 */
export async function getTicket(id: string): Promise<Ticket | null> {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          displayName: true,
          phone: true,
        },
      },
      order: true,
      assignedTo: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      attachments: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          author: {
            select: { id: true, displayName: true, role: true },
          },
        },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          actor: {
            select: { id: true, displayName: true },
          },
        },
      },
    },
  });
}

/**
 * Liste les tickets avec pagination et filtres
 */
export async function listTickets(
  params: PaginationParams & {
    status?: TicketStatus;
    issueType?: IssueType;
    priority?: TicketPriority;
    assignedToId?: string;
    search?: string;
    customerId?: string;
  }
): Promise<PaginatedResult<Ticket>> {
  const {
    page,
    limit,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    issueType,
    priority,
    assignedToId,
    search,
    customerId,
  } = params;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (issueType) where.issueType = issueType;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (customerId) where.customerId = customerId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, displayName: true, email: true },
        },
        assignedTo: {
          select: { id: true, displayName: true },
        },
        _count: {
          select: { messages: true, attachments: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Met à jour un ticket
 * - Clients: peuvent seulement réouvrir leurs propres tickets
 * - Agents/Admins: accès complet
 */
export async function updateTicket(
  ticketId: string,
  data: UpdateTicketDto,
  updatedBy: string,
  userRole?: string
): Promise<Ticket> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw AppError.notFound('Ticket non trouvé');
  }

  // Vérification pour les clients
  if (userRole === 'CUSTOMER') {
    // Les clients ne peuvent modifier que leurs propres tickets
    if (ticket.customerId !== updatedBy) {
      throw AppError.forbidden('Vous ne pouvez pas modifier ce ticket');
    }
    // Les clients ne peuvent que réouvrir un ticket résolu/fermé
    if (data.status && data.status !== 'REOPENED') {
      throw AppError.forbidden('Vous pouvez uniquement réouvrir un ticket');
    }
    // Les clients ne peuvent pas modifier d'autres champs
    if (data.priority || data.assignedToId !== undefined || data.title || data.description !== undefined || data.tags) {
      throw AppError.forbidden('Modification non autorisée');
    }
  }

  // Prépare les changements d'historique
  interface HistoryEntry {
    ticketId: string;
    actorId: string;
    action: 'UPDATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'ASSIGNED';
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }

  const historyEntries: HistoryEntry[] = [];

  if (data.status && data.status !== ticket.status) {
    historyEntries.push({
      ticketId,
      actorId: updatedBy,
      action: 'STATUS_CHANGED',
      field: 'status',
      oldValue: ticket.status,
      newValue: data.status,
    });
  }

  if (data.priority && data.priority !== ticket.priority) {
    historyEntries.push({
      ticketId,
      actorId: updatedBy,
      action: 'PRIORITY_CHANGED',
      field: 'priority',
      oldValue: ticket.priority,
      newValue: data.priority,
    });
  }

  if (data.assignedToId !== undefined && data.assignedToId !== ticket.assignedToId) {
    historyEntries.push({
      ticketId,
      actorId: updatedBy,
      action: 'ASSIGNED',
      field: 'assignedTo',
      oldValue: ticket.assignedToId,
      newValue: data.assignedToId,
    });
  }

  // Transaction: update + historique
  const [updatedTicket] = await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...(data.status && { status: data.status as TicketStatus }),
        ...(data.priority && { priority: data.priority as TicketPriority }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags && { tags: data.tags }),
      },
      include: {
        customer: true,
        order: true,
        assignedTo: true,
        attachments: true,
      },
    }),
    ...(historyEntries.length > 0
      ? [prisma.ticketHistory.createMany({ data: historyEntries })]
      : []),
  ]);

  // ============================================
  // ENVOI DES NOTIFICATIONS
  // ============================================

  // Notification changement de statut
  if (data.status && data.status !== ticket.status) {
    // Notifier le client si ce n'est pas lui qui a fait le changement
    if (ticket.customerId && ticket.customerId !== updatedBy) {
      await notifyStatusChange(ticketId, ticket.customerId, data.status, ticket.title);
    }
    // Notifier l'agent assigné si ce n'est pas lui qui a fait le changement
    if (ticket.assignedToId && ticket.assignedToId !== updatedBy) {
      await notifyStatusChange(ticketId, ticket.assignedToId, data.status, ticket.title);
    }
  }

  // Notification nouvelle assignation
  if (data.assignedToId && data.assignedToId !== ticket.assignedToId) {
    await notifyTicketAssigned(ticketId, data.assignedToId, ticket.title);
  }

  // Notification changement de priorité
  if (data.priority && data.priority !== ticket.priority) {
    const priorityLabels: Record<string, string> = {
      LOW: 'Basse',
      MEDIUM: 'Moyenne',
      HIGH: 'Haute',
      URGENT: 'Urgente',
    };

    // Notifier l'agent assigné
    if (ticket.assignedToId && ticket.assignedToId !== updatedBy) {
      await createNotification({
        userId: ticket.assignedToId,
        type: 'TICKET_UPDATE',
        ticketId,
        payload: {
          action: 'priority_changed',
          title: 'Priorité modifiée',
          content: `Le ticket "${ticket.title}" est maintenant en priorité ${priorityLabels[data.priority] || data.priority}.`,
          newPriority: data.priority,
        },
      });
    }

    // Notifier le client si la priorité devient urgente
    if (data.priority === 'URGENT' && ticket.customerId && ticket.customerId !== updatedBy) {
      await createNotification({
        userId: ticket.customerId,
        type: 'TICKET_UPDATE',
        ticketId,
        payload: {
          action: 'priority_changed',
          title: 'Ticket marqué urgent',
          content: `Votre ticket "${ticket.title}" a été marqué comme urgent.`,
          newPriority: data.priority,
        },
      });
    }
  }

  return updatedTicket;
}

/**
 * Statistiques des tickets (dashboard admin)
 */
export async function getTicketStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  openedToday: number;
  slaBreached: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, byStatus, byType, byPriority, openedToday, slaBreached] =
    await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['issueType'],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: true,
      }),
      prisma.ticket.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.ticket.count({
        where: { slaBreached: true },
      }),
    ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byType: Object.fromEntries(byType.map((t) => [t.issueType, t._count])),
    byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
    openedToday,
    slaBreached,
  };
}
