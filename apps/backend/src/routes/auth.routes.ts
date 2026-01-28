import { Router, type RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, loginByCustomerCodeSchema, loginByReferenceSchema, adminLoginSchema, refreshTokenSchema, googleOAuthSchema, oauthProviderSchema, emailLoginSchema, changePasswordSchema } from '../middlewares/validate.middleware.js';

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

const router = Router();

// ============================================
// OAUTH ROUTES (Google, Microsoft, etc.)
// ============================================

/**
 * POST /api/auth/oauth/google
 * Connexion/Inscription via Google OAuth
 */
router.post(
  '/oauth/google',
  validate({ body: googleOAuthSchema }),
  authController.loginWithGoogle as unknown as RequestHandler
);

/**
 * POST /api/auth/oauth/link/google
 * Lier un compte Google à l'utilisateur connecté
 */
router.post(
  '/oauth/link/google',
  authenticate as unknown as RequestHandler,
  validate({ body: googleOAuthSchema }),
  authController.linkGoogleAccount as unknown as RequestHandler
);

/**
 * DELETE /api/auth/oauth/unlink/:provider
 * Délier un compte social de l'utilisateur connecté
 */
router.delete(
  '/oauth/unlink/:provider',
  authenticate as unknown as RequestHandler,
  validate({ params: oauthProviderSchema }),
  authController.unlinkSocialAccount as unknown as RequestHandler
);

/**
 * GET /api/auth/oauth/accounts
 * Récupère les comptes sociaux liés à l'utilisateur connecté
 */
router.get(
  '/oauth/accounts',
  authenticate as unknown as RequestHandler,
  authController.getLinkedAccounts as unknown as RequestHandler
);

// ============================================
// STANDARD AUTH ROUTES
// ============================================

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

/**
 * POST /api/auth/link-customer-code
 * Lie le compte de l'utilisateur connecté à un code client SAGE
 * Utilisé après une connexion Google pour rattacher au compte SAGE
 */
router.post(
  '/link-customer-code',
  authenticate as unknown as RequestHandler,
  validate({ body: loginByCustomerCodeSchema }),
  authController.linkToCustomerCode as unknown as RequestHandler
);

// ============================================
// EMAIL + PASSWORD AUTH
// ============================================

/**
 * POST /api/auth/login/email
 * Connexion client par email + mot de passe
 */
router.post(
  '/login/email',
  validate({ body: emailLoginSchema }),
  authController.loginWithEmail as unknown as RequestHandler
);

/**
 * POST /api/auth/change-password
 * Change le mot de passe de l'utilisateur connecté
 */
router.post(
  '/change-password',
  authenticate as unknown as RequestHandler,
  validate({ body: changePasswordSchema }),
  authController.changePassword as unknown as RequestHandler
);

export default router;
