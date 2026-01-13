import { Router } from 'express';
import * as healthController from '../controllers/health.controller.js';

// ============================================
// ROUTES DE SANTÉ
// ============================================

const router = Router();

/**
 * GET /api/health
 * Vérifie l'état de santé complet de l'API
 * Retourne les détails de chaque dépendance
 */
router.get('/', healthController.check);

/**
 * GET /api/health/ready
 * Readiness probe pour Kubernetes/orchestrateurs
 * Retourne 200 si prêt à recevoir du trafic
 */
router.get('/ready', healthController.ready);

/**
 * GET /api/health/live
 * Liveness probe pour Kubernetes/orchestrateurs
 * Retourne 200 si le processus est vivant
 */
router.get('/live', healthController.live);

export default router;
