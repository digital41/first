import type { Request, Response, NextFunction } from 'express';
import * as ticketService from '../services/ticket.service.js';
import { sendSuccess, sendPaginated } from '../utils/index.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { TicketStatus, IssueType, TicketPriority } from '@prisma/client';

// ============================================
// CONTROLLER DES TICKETS
// ============================================

/**
 * POST /api/tickets
 * Crée un nouveau ticket SAV
 */
export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await ticketService.createTicket(req.body, req.user?.id);

    sendSuccess(res, ticket, 'Ticket créé avec succès', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/:id
 * Récupère un ticket par ID ou numéro
 */
export async function getOne(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await ticketService.getTicket(req.params.id as string);

    if (!ticket) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    sendSuccess(res, ticket);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets
 * Liste les tickets avec pagination et filtres
 */
export async function list(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      page = '1',
      limit = '20',
      sortBy,
      sortOrder,
      status,
      excludeStatus,
      issueType,
      priority,
      assignedToId,
      search,
    } = req.query;

    // Si c'est un client, ne montre que ses tickets
    const customerId = req.user.role === 'CUSTOMER' ? req.user.id : undefined;

    // Si c'est un agent (pas ADMIN ou SUPERVISOR), ne montre que ses tickets assignés
    // Sauf s'il a explicitement demandé un autre agent via le filtre
    let effectiveAssignedToId = assignedToId as string | undefined;
    if (req.user.role === 'AGENT' && !assignedToId) {
      effectiveAssignedToId = req.user.id;
    }

    // Parser excludeStatus (peut être une string séparée par des virgules)
    let parsedExcludeStatus: TicketStatus[] | undefined;
    if (excludeStatus) {
      parsedExcludeStatus = (excludeStatus as string).split(',') as TicketStatus[];
    }

    const result = await ticketService.listTickets({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      status: status as TicketStatus,
      excludeStatus: parsedExcludeStatus,
      issueType: issueType as IssueType,
      priority: priority as TicketPriority,
      assignedToId: effectiveAssignedToId,
      search: search as string,
      customerId,
    });

    sendPaginated(res, result.data, result.meta);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/tickets/:id
 * Met à jour un ticket
 * - Clients: peuvent seulement réouvrir leurs propres tickets
 * - Agents/Admins: accès complet
 */
export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await ticketService.updateTicket(
      req.params.id as string,
      req.body,
      req.user.id,
      req.user.role
    );

    sendSuccess(res, ticket, 'Ticket mis à jour');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tickets/stats
 * Statistiques des tickets
 * - ADMIN/SUPERVISOR: stats globales de tous les tickets
 * - AGENT: stats uniquement de ses tickets assignés
 */
export async function stats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, id } = req.user;

    // Pour les agents: filtrer par leurs tickets assignés
    // Pour admin/supervisor: voir toutes les stats
    const assignedToId = ['ADMIN', 'SUPERVISOR'].includes(role) ? undefined : id;

    const statistics = await ticketService.getTicketStats(assignedToId);

    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/client/tickets/my-stats
 * Statistiques des tickets pour le client connecté (inclut tous les statuts pour KPIs)
 */
export async function myStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customerId = req.user.id;
    const statistics = await ticketService.getClientTicketStats(customerId);

    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
}

// ============================================
// TRANSFERT DE TICKETS
// ============================================

/**
 * POST /api/admin/tickets/:id/transfer
 * Demande un transfert de ticket vers un autre agent
 */
export async function requestTransfer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticketId = req.params.id as string;
    const { toAgentId, reason } = req.body;

    if (!toAgentId) {
      res.status(400).json({ success: false, error: 'Agent cible requis' });
      return;
    }

    const transfer = await ticketService.requestTicketTransfer(
      ticketId,
      req.user.id,
      toAgentId,
      reason
    );

    sendSuccess(res, transfer, 'Demande de transfert envoyée');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/transfers/:transferId/accept
 * Accepte un transfert de ticket
 */
export async function acceptTransfer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { transferId } = req.params;

    const ticket = await ticketService.acceptTicketTransfer(
      transferId as string,
      req.user.id
    );

    sendSuccess(res, ticket, 'Transfert accepté');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/transfers/:transferId/decline
 * Refuse un transfert de ticket
 */
export async function declineTransfer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;

    await ticketService.declineTicketTransfer(
      transferId as string,
      req.user.id,
      reason
    );

    sendSuccess(res, null, 'Transfert refusé');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/transfers/pending
 * Récupère les transferts en attente pour l'agent connecté
 */
export async function getPendingTransfers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const transfers = ticketService.getPendingTransfersForAgent(req.user.id);
    sendSuccess(res, transfers);
  } catch (error) {
    next(error);
  }
}
