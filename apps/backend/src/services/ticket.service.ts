import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { CreateTicketDto, UpdateTicketDto, PaginatedResult, PaginationParams } from '../types/index.js';
import type { Ticket, TicketStatus, TicketPriority, IssueType } from '@prisma/client';
import {
  notifyStatusChange,
  notifyTicketAssigned,
  createNotification,
} from './notification.service.js';
import { AIService } from './ai.service.js';
import { broadcastAITyping, broadcastNewMessage } from '../websocket/index.js';

// ============================================
// SERVICE DE GESTION DES TICKETS
// ============================================

/**
 * Trouve l'agent le moins chargé pour auto-assignation
 * Utilise l'algorithme du moins de tickets actifs (load balancing)
 */
async function findBestAvailableAgent(): Promise<string | null> {
  // Récupérer tous les agents et superviseurs actifs
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ['AGENT', 'SUPERVISOR'] },
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: { notIn: ['RESOLVED', 'CLOSED'] },
            },
          },
        },
      },
    },
  });

  if (agents.length === 0) return null;

  // Trier par nombre de tickets actifs (le moins chargé en premier)
  agents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);

  // Retourner l'agent le moins chargé
  return agents[0].id;
}

/**
 * Auto-assigne un ticket à un agent disponible
 */
export async function autoAssignTicket(ticketId: string): Promise<{ agentId: string; agentName: string } | null> {
  const agentId = await findBestAvailableAgent();
  if (!agentId) return null;

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, displayName: true },
  });

  if (!agent) return null;

  // Mettre à jour le ticket avec l'assignation
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: agentId,
      status: 'IN_PROGRESS',
    },
  });

  // Enregistrer dans l'historique
  await prisma.ticketHistory.create({
    data: {
      ticketId,
      action: 'AUTO_ASSIGNED',
      field: 'assignedToId',
      oldValue: null,
      newValue: agentId,
    },
  });

  return { agentId: agent.id, agentName: agent.displayName };
}

/**
 * Crée un nouveau ticket SAV
 */
export async function createTicket(
  data: CreateTicketDto,
  customerId?: string
): Promise<Ticket> {
  // Valider orderId si fourni - doit exister dans la base locale
  // Les numéros de commande SAGE (ex: F26010226) ne sont pas des IDs locaux
  let validOrderId: string | undefined = undefined;
  if (data.orderId) {
    // Vérifier si l'orderId existe dans la base locale
    const localOrder = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true },
    });
    if (localOrder) {
      validOrderId = localOrder.id;
    }
    // Si pas trouvé, c'est probablement un numéro SAGE - on ne l'utilise pas comme FK
  }

  const ticket = await prisma.ticket.create({
    data: {
      customerId,
      orderId: validOrderId,
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
      // Informations équipement
      serialNumber: data.serialNumber,
      equipmentModel: data.equipmentModel,
      equipmentBrand: data.equipmentBrand,
      errorCode: data.errorCode,
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

  // ============================================
  // AUTO-ASSIGNATION AUTOMATIQUE
  // ============================================
  // Assigner automatiquement le ticket à l'agent le moins chargé
  const assignResult = await autoAssignTicket(ticket.id);
  if (assignResult) {
    console.log(`[Auto-Assign] Ticket #${ticket.ticketNumber} assigné à ${assignResult.agentName}`);

    // Notifier l'agent de la nouvelle assignation
    await notifyTicketAssigned(ticket.id, assignResult.agentId, ticket.title);

    // Mettre à jour le ticket retourné avec les nouvelles infos
    ticket.assignedToId = assignResult.agentId;
    ticket.status = 'IN_PROGRESS';
  }

  // ============================================
  // DÉCLENCHEMENT IA AUTOMATIQUE À LA CRÉATION
  // ============================================
  // L'IA commence la conversation immédiatement
  triggerAIWelcome(ticket.id).catch(err => {
    console.error('[AI Welcome] Erreur:', err);
  });

  return ticket;
}

/**
 * Déclenche un message de bienvenue IA dès la création du ticket
 */
async function triggerAIWelcome(ticketId: string): Promise<void> {
  try {
    // Petit délai pour que le ticket soit bien créé et que le WebSocket soit prêt
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Récupérer le contexte du ticket
    const context = await AIService.getTicketContext(ticketId);
    if (!context) {
      console.log(`[AI Welcome] Ticket ${ticketId} non trouvé`);
      return;
    }

    // Notifier que l'IA est en train d'écrire
    broadcastAITyping(ticketId, true);

    // Générer la réponse IA de bienvenue
    console.log(`[AI Welcome] Génération message d'accueil pour ticket #${context.ticketNumber}...`);
    const response = await AIService.generateResponse(context);

    // Arrêter l'indicateur de frappe
    broadcastAITyping(ticketId, false);

    if (!response.success) {
      console.error(`[AI Welcome] Échec génération pour ticket ${ticketId}`);
      return;
    }

    // Sauvegarder le message IA
    await AIService.saveAIMessage(ticketId, response.message, {
      confidence: response.confidence,
      shouldEscalate: response.shouldEscalate,
      generatedAt: new Date().toISOString(),
      auto: true,
      isWelcome: true,
    });

    // Récupérer le message IA créé pour le broadcast
    const aiMessage = await prisma.chatMessage.findFirst({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, displayName: true, role: true },
        },
      },
    });

    if (aiMessage) {
      // Broadcast via WebSocket
      broadcastNewMessage(ticketId, {
        id: aiMessage.id,
        authorId: aiMessage.author?.id,
        authorName: aiMessage.author?.displayName || 'Assistant IA KLY',
        content: aiMessage.content,
        isInternal: false,
        createdAt: aiMessage.createdAt.toISOString(),
        attachments: [],
        isAI: true,
        offerHumanHelp: false, // Pas de proposition humain au premier message
      });
    }

    console.log(`[AI Welcome] Message d'accueil envoyé pour ticket #${context.ticketNumber}`);
  } catch (error) {
    broadcastAITyping(ticketId, false);
    console.error('[AI Welcome] Erreur:', error);
  }
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
    excludeStatus?: TicketStatus[];
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
    excludeStatus,
    issueType,
    priority,
    assignedToId,
    search,
    customerId,
  } = params;

  const where: Record<string, unknown> = {};

  // Filtrage par statut
  if (status) {
    // Si un statut spécifique est demandé
    where.status = status;
  } else if (excludeStatus && excludeStatus.length > 0) {
    // Si des statuts sont à exclure
    where.status = { notIn: excludeStatus };
  } else if (customerId) {
    // Pour les clients: exclure les tickets résolus/fermés par défaut
    where.status = { notIn: ['RESOLVED', 'CLOSED'] };
  }
  // Pour les admins/agents sans filtre: on montre tous les tickets

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
          select: { id: true, displayName: true, email: true, phone: true },
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
        // Informations équipement
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.equipmentModel !== undefined && { equipmentModel: data.equipmentModel }),
        ...(data.equipmentBrand !== undefined && { equipmentBrand: data.equipmentBrand }),
        ...(data.errorCode !== undefined && { errorCode: data.errorCode }),
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
 * Statistiques des tickets pour un client (dashboard client)
 * Inclut TOUS les tickets y compris résolus pour les KPIs
 */
export async function getClientTicketStats(customerId: string): Promise<{
  total: number;
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  slaBreached: number;
}> {
  const [tickets, slaBreachedCount] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['status'],
      where: { customerId },
      _count: true,
    }),
    prisma.ticket.count({
      where: { customerId, slaBreached: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    tickets.map((t) => [t.status, t._count])
  );

  return {
    total: tickets.reduce((sum, t) => sum + t._count, 0),
    open: (statusCounts['OPEN'] || 0) + (statusCounts['REOPENED'] || 0),
    inProgress: (statusCounts['IN_PROGRESS'] || 0) + (statusCounts['ESCALATED'] || 0),
    waitingCustomer: statusCounts['WAITING_CUSTOMER'] || 0,
    resolved: statusCounts['RESOLVED'] || 0,
    closed: statusCounts['CLOSED'] || 0,
    slaBreached: slaBreachedCount,
  };
}

// ============================================
// SYSTÈME DE TRANSFERT DE TICKETS
// ============================================

interface TransferRequest {
  id: string;
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  reason?: string;
  createdAt: string;
}

// Stockage en mémoire des demandes de transfert (en production, utiliser Redis ou DB)
const pendingTransfers = new Map<string, TransferRequest>();

/**
 * Demande un transfert de ticket vers un autre agent
 */
export async function requestTicketTransfer(
  ticketId: string,
  fromAgentId: string,
  toAgentId: string,
  reason?: string
): Promise<TransferRequest> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      assignedToId: true,
    },
  });

  if (!ticket) {
    throw AppError.notFound('Ticket non trouvé');
  }

  if (ticket.assignedToId !== fromAgentId) {
    throw AppError.forbidden('Vous ne pouvez transférer que vos propres tickets');
  }

  const [fromAgent, toAgent] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromAgentId }, select: { displayName: true } }),
    prisma.user.findUnique({ where: { id: toAgentId }, select: { displayName: true, isActive: true } }),
  ]);

  if (!toAgent || !toAgent.isActive) {
    throw AppError.badRequest('Agent cible invalide ou inactif');
  }

  const transferId = `transfer_${ticketId}_${Date.now()}`;
  const transferRequest: TransferRequest = {
    id: transferId,
    ticketId,
    ticketNumber: ticket.ticketNumber,
    ticketTitle: ticket.title,
    fromAgentId,
    fromAgentName: fromAgent?.displayName || 'Agent',
    toAgentId,
    reason,
    createdAt: new Date().toISOString(),
  };

  // Stocker la demande
  pendingTransfers.set(transferId, transferRequest);

  // Notifier l'agent cible
  await createNotification({
    userId: toAgentId,
    type: 'TICKET_UPDATE',
    ticketId,
    payload: {
      action: 'transfer_request',
      title: 'Demande de transfert',
      content: `${fromAgent?.displayName || 'Un agent'} souhaite vous transférer le ticket "${ticket.title}".`,
      transferId,
      fromAgentId,
      fromAgentName: fromAgent?.displayName,
      reason,
    },
  });

  return transferRequest;
}

/**
 * Accepte un transfert de ticket
 */
export async function acceptTicketTransfer(
  transferId: string,
  acceptingAgentId: string
): Promise<Ticket> {
  const transfer = pendingTransfers.get(transferId);

  if (!transfer) {
    throw AppError.notFound('Demande de transfert non trouvée ou expirée');
  }

  if (transfer.toAgentId !== acceptingAgentId) {
    throw AppError.forbidden('Vous n\'êtes pas le destinataire de ce transfert');
  }

  // Effectuer le transfert
  const ticket = await prisma.ticket.update({
    where: { id: transfer.ticketId },
    data: { assignedToId: acceptingAgentId },
  });

  // Enregistrer dans l'historique
  await prisma.ticketHistory.create({
    data: {
      ticketId: transfer.ticketId,
      actorId: acceptingAgentId,
      action: 'TRANSFER_ACCEPTED',
      field: 'assignedToId',
      oldValue: transfer.fromAgentId,
      newValue: acceptingAgentId,
    },
  });

  // Notifier l'agent d'origine
  const acceptingAgent = await prisma.user.findUnique({
    where: { id: acceptingAgentId },
    select: { displayName: true },
  });

  await createNotification({
    userId: transfer.fromAgentId,
    type: 'TICKET_UPDATE',
    ticketId: transfer.ticketId,
    payload: {
      action: 'transfer_accepted',
      title: 'Transfert accepté',
      content: `${acceptingAgent?.displayName} a accepté le transfert du ticket "${transfer.ticketTitle}".`,
    },
  });

  // Supprimer la demande
  pendingTransfers.delete(transferId);

  return ticket;
}

/**
 * Refuse un transfert de ticket
 */
export async function declineTicketTransfer(
  transferId: string,
  decliningAgentId: string,
  declineReason?: string
): Promise<void> {
  const transfer = pendingTransfers.get(transferId);

  if (!transfer) {
    throw AppError.notFound('Demande de transfert non trouvée ou expirée');
  }

  if (transfer.toAgentId !== decliningAgentId) {
    throw AppError.forbidden('Vous n\'êtes pas le destinataire de ce transfert');
  }

  // Notifier l'agent d'origine
  const decliningAgent = await prisma.user.findUnique({
    where: { id: decliningAgentId },
    select: { displayName: true },
  });

  await createNotification({
    userId: transfer.fromAgentId,
    type: 'TICKET_UPDATE',
    ticketId: transfer.ticketId,
    payload: {
      action: 'transfer_declined',
      title: 'Transfert refusé',
      content: `${decliningAgent?.displayName} a refusé le transfert du ticket "${transfer.ticketTitle}".${declineReason ? ` Raison: ${declineReason}` : ''}`,
      declineReason,
    },
  });

  // Supprimer la demande
  pendingTransfers.delete(transferId);
}

/**
 * Récupère les demandes de transfert en attente pour un agent
 */
export function getPendingTransfersForAgent(agentId: string): TransferRequest[] {
  const transfers: TransferRequest[] = [];
  pendingTransfers.forEach(transfer => {
    if (transfer.toAgentId === agentId) {
      transfers.push(transfer);
    }
  });
  return transfers;
}

/**
 * Statistiques des tickets (dashboard admin/agent)
 * @param assignedToId - Si fourni, filtre les stats par agent assigné (pour les agents)
 *                       Si non fourni, retourne les stats globales (pour les admins)
 */
export async function getTicketStats(assignedToId?: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  openedToday: number;
  slaBreached: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filtre optionnel par agent assigné
  const whereAgent = assignedToId ? { assignedToId } : {};

  const [total, byStatus, byType, byPriority, openedToday, slaBreached] =
    await Promise.all([
      prisma.ticket.count({ where: whereAgent }),
      prisma.ticket.groupBy({
        by: ['status'],
        where: whereAgent,
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['issueType'],
        where: whereAgent,
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        where: whereAgent,
        _count: true,
      }),
      prisma.ticket.count({
        where: { ...whereAgent, createdAt: { gte: today } },
      }),
      prisma.ticket.count({
        where: { ...whereAgent, slaBreached: true },
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
