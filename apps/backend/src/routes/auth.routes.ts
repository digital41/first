import { Router, type RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, loginByReferenceSchema, adminLoginSchema, refreshTokenSchema } from '../middlewares/validate.middleware.js';

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

const router = Router();

/**
 * POST /api/auth/login
 * Connexion client par références commande (BC, PL, BL)
 */
router.post(
  '/login',
  validate({ body: loginByReferenceSchema }),
  authController.loginByReference as unknown as RequestHandler
);

/**
 * POST /api/auth/admin/login
 * Connexion admin/agent par email + mot de passe
 */
router.post(
  '/admin/login',
  validate({ body: adminLoginSchema }),
  authController.loginAdmin as unknown as RequestHandler
);

/**
 * POST /api/auth/refresh
 * Rafraîchit les tokens JWT (rotation)
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refresh as unknown as RequestHandler
);

/**
 * POST /api/auth/logout
 * Déconnexion (révoque le refresh token)
 */
router.post(
  '/logout',
  validate({ body: refreshTokenSchema }),
  authController.logout as unknown as RequestHandler
);

/**
 * GET /api/auth/me
 * Retourne les infos de l'utilisateur connecté
 */
router.get('/me', authenticate as unknown as RequestHandler, authController.me as unknown as RequestHandler);

export default router;
