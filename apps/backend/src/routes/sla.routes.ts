import { Router, type RequestHandler } from 'express';
import { authenticate, requireAdmin, requireSupervisor } from '../middlewares/auth.middleware.js';
import * as slaController from '../controllers/sla.controller.js';

// ============================================
// ROUTES SLA
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as unknown as RequestHandler);

// GET /api/sla/stats - Statistiques SLA (supervisor+)
router.get(
  '/stats',
  requireSupervisor as unknown as RequestHandler,
  slaController.getSlaStatistics as unknown as RequestHandler
);

// GET /api/sla/configs - Liste des configurations (supervisor+)
router.get(
  '/configs',
  requireSupervisor as unknown as RequestHandler,
  slaController.listSlaConfigs as unknown as RequestHandler
);

// POST /api/sla/configs - Créer une configuration (admin)
router.post(
  '/configs',
  requireAdmin as unknown as RequestHandler,
  slaController.createSlaConfig as unknown as RequestHandler
);

// GET /api/sla/configs/:id - Détails d'une configuration (supervisor+)
router.get(
  '/configs/:id',
  requireSupervisor as unknown as RequestHandler,
  slaController.getSlaConfig as unknown as RequestHandler
);

// PUT /api/sla/configs/:id - Modifier une configuration (admin)
router.put(
  '/configs/:id',
  requireAdmin as unknown as RequestHandler,
  slaController.updateSlaConfig as unknown as RequestHandler
);

// DELETE /api/sla/configs/:id - Supprimer une configuration (admin)
router.delete(
  '/configs/:id',
  requireAdmin as unknown as RequestHandler,
  slaController.deleteSlaConfig as unknown as RequestHandler
);

export default router;
