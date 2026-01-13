import { Router, type RequestHandler } from 'express';
import * as ticketController from '../controllers/ticket.controller.js';
import { authenticate, requireStaff } from '../middlewares/auth.middleware.js';
import {
  validate,
  createTicketSchema,
  updateTicketSchema,
  cuidSchema,
  paginationSchema,
} from '../middlewares/validate.middleware.js';
import { z } from 'zod';

// ============================================
// ROUTES DES TICKETS
// ============================================

const router = Router();

// Schéma étendu pour les filtres de liste
const listQuerySchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'ESCALATED', 'REOPENED']).optional(),
  issueType: z.enum(['TECHNICAL', 'DELIVERY', 'BILLING', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().cuid().optional(),
  search: z.string().optional(),
});

/**
 * POST /api/tickets
 * Crée un nouveau ticket SAV
 * Accessible aux clients authentifiés et aux visiteurs
 */
router.post(
  '/',
  validate({ body: createTicketSchema }),
  ticketController.create as unknown as RequestHandler
);

/**
 * GET /api/tickets
 * Liste les tickets avec pagination et filtres
 * Authentification requise
 */
router.get(
  '/',
  authenticate as unknown as RequestHandler,
  validate({ query: listQuerySchema }),
  ticketController.list as unknown as RequestHandler
);

/**
 * GET /api/tickets/stats
 * Statistiques des tickets (admin/agent)
 */
router.get('/stats', authenticate as unknown as RequestHandler, requireStaff as unknown as RequestHandler, ticketController.stats as unknown as RequestHandler);

/**
 * GET /api/tickets/:id
 * Récupère un ticket par ID
 */
router.get(
  '/:id',
  validate({ params: cuidSchema }),
  ticketController.getOne as unknown as RequestHandler
);

/**
 * PUT /api/tickets/:id
 * Met à jour un ticket (admin/agent uniquement)
 */
router.put(
  '/:id',
  authenticate as unknown as RequestHandler,
  requireStaff as unknown as RequestHandler,
  validate({ params: cuidSchema, body: updateTicketSchema }),
  ticketController.update as unknown as RequestHandler
);

export default router;
