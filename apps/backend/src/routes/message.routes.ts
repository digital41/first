import { Router, type RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as messageController from '../controllers/message.controller.js';

// ============================================
// ROUTES MESSAGES
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as unknown as RequestHandler);

// GET /api/tickets/:ticketId/messages - Liste les messages d'un ticket
router.get('/tickets/:ticketId/messages', messageController.getMessages as unknown as RequestHandler);

// POST /api/tickets/:ticketId/messages - Créer un message
router.post('/tickets/:ticketId/messages', messageController.createMessage as unknown as RequestHandler);

// PUT /api/messages/:id/read - Marquer comme lu
router.put('/messages/:id/read', messageController.markAsRead as unknown as RequestHandler);

export default router;
