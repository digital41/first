import { Router, type RequestHandler } from 'express';
import { authenticate, requireStaff, requireSupervisor } from '../middlewares/auth.middleware.js';
import * as cannedResponseController from '../controllers/canned-response.controller.js';

// ============================================
// ROUTES CANNED RESPONSES (Réponses prédéfinies)
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification staff
router.use(authenticate as unknown as RequestHandler);
router.use(requireStaff as unknown as RequestHandler);

// GET /api/canned-responses/tags - Liste des tags
router.get(
  '/tags',
  cannedResponseController.getCannedResponseTags as unknown as RequestHandler
);

// GET /api/canned-responses - Liste des réponses
router.get(
  '/',
  cannedResponseController.listCannedResponses as unknown as RequestHandler
);

// POST /api/canned-responses - Créer une réponse (supervisor+)
router.post(
  '/',
  requireSupervisor as unknown as RequestHandler,
  cannedResponseController.createCannedResponse as unknown as RequestHandler
);

// GET /api/canned-responses/:id - Détails d'une réponse
router.get(
  '/:id',
  cannedResponseController.getCannedResponse as unknown as RequestHandler
);

// PUT /api/canned-responses/:id - Modifier une réponse (supervisor+)
router.put(
  '/:id',
  requireSupervisor as unknown as RequestHandler,
  cannedResponseController.updateCannedResponse as unknown as RequestHandler
);

// DELETE /api/canned-responses/:id - Supprimer une réponse (supervisor+)
router.delete(
  '/:id',
  requireSupervisor as unknown as RequestHandler,
  cannedResponseController.deleteCannedResponse as unknown as RequestHandler
);

// POST /api/canned-responses/:id/use - Utiliser une réponse
router.post(
  '/:id/use',
  cannedResponseController.useCannedResponse as unknown as RequestHandler
);

export default router;
