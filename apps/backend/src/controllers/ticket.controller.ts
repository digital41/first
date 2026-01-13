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
      issueType,
      priority,
      assignedToId,
      search,
    } = req.query;

    // Si c'est un client, ne montre que ses tickets
    const customerId = req.user.role === 'CUSTOMER' ? req.user.id : undefined;

    const result = await ticketService.listTickets({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      status: status as TicketStatus,
      issueType: issueType as IssueType,
      priority: priority as TicketPriority,
      assignedToId: assignedToId as string,
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
 * Statistiques des tickets (admin uniquement)
 */
export async function stats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const statistics = await ticketService.getTicketStats();

    sendSuccess(res, statistics);
  } catch (error) {
    next(error);
  }
}
