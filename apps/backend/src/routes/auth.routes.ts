import { Router, type RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, loginByCustomerCodeSchema, loginByReferenceSchema, adminLoginSchema, refreshTokenSchema } from '../middlewares/validate.middleware.js';

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

const router = Router();

/**
 * POST /api/auth/login
 * Connexion client par code compte client SAGE 100
 */
router.post(
  '/login',
  validate({ body: loginByCustomerCodeSchema }),
  authController.loginByCustomerCode as unknown as RequestHandler
);

/**
 * POST /api/auth/login/reference
 * Connexion client par références SAGE 100 (BC, BL, FA) - Ancienne méthode
 */
router.post(
  '/login/reference',
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

/**
 * PUT /api/auth/me
 * Met à jour le profil de l'utilisateur connecté
 */
router.put('/me', authenticate as unknown as RequestHandler, authController.updateProfile as unknown as RequestHandler);

export default router;
