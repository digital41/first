import { Router, type RequestHandler } from 'express';
import { authenticate, requireAdmin, requireSupervisor, requireStaff } from '../middlewares/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

// ============================================
// ROUTES UTILISATEURS
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as unknown as RequestHandler);

// GET /api/users/agents - Liste des agents (staff)
router.get(
  '/agents',
  requireStaff as unknown as RequestHandler,
  userController.getAvailableAgents as unknown as RequestHandler
);

// GET /api/users - Liste des utilisateurs (supervisor+)
router.get(
  '/',
  requireSupervisor as unknown as RequestHandler,
  userController.listUsers as unknown as RequestHandler
);

// POST /api/users - Créer un utilisateur (admin)
router.post(
  '/',
  requireAdmin as unknown as RequestHandler,
  userController.createUser as unknown as RequestHandler
);

// GET /api/users/:id - Détails utilisateur (supervisor+)
router.get(
  '/:id',
  requireSupervisor as unknown as RequestHandler,
  userController.getUserById as unknown as RequestHandler
);

// GET /api/users/:id/stats - Stats agent (supervisor+)
router.get(
  '/:id/stats',
  requireSupervisor as unknown as RequestHandler,
  userController.getAgentStats as unknown as RequestHandler
);

// PUT /api/users/:id - Modifier utilisateur (admin)
router.put(
  '/:id',
  requireAdmin as unknown as RequestHandler,
  userController.updateUser as unknown as RequestHandler
);

// DELETE /api/users/:id - Supprimer utilisateur (admin)
router.delete(
  '/:id',
  requireAdmin as unknown as RequestHandler,
  userController.deleteUser as unknown as RequestHandler
);

export default router;
