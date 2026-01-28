import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import * as oauthService from '../services/oauth.service.js';
import { sendSuccess } from '../utils/index.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { OAuthProvider } from '@prisma/client';

// ============================================
// CONTROLLER D'AUTHENTIFICATION
// ============================================

/**
 * POST /api/auth/login
 * Connexion client par code compte client SAGE 100
 */
export async function loginByCustomerCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerCode } = req.body;
    const result = await authService.loginByCustomerCode(customerCode);

    sendSuccess(res, result, 'Connexion réussie');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login/reference
 * Connexion client par références SAGE 100 (BC, BL ou FA) - Ancienne méthode
 */
export async function loginByReference(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderNumber, blNumber, faNumber } = req.body;
    const result = await authService.loginByReference(orderNumber, blNumber, faNumber);

    sendSuccess(res, result, `Connexion réussie via ${result.referenceType}`);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/admin/login
 * Connexion admin/agent par email + mot de passe
 */
export async function loginAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password);

    sendSuccess(res, result, 'Connexion admin réussie');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Rafraîchit les tokens JWT
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);

    sendSuccess(res, result, 'Tokens rafraîchis');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Déconnexion (révoque le refresh token)
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    sendSuccess(res, null, 'Déconnexion réussie');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Retourne les infos de l'utilisateur connecté (depuis la base de données)
 */
export async function me(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Récupérer l'utilisateur complet depuis la base de données
  const fullUser = await authService.getUserById(req.user.id);

  if (!fullUser) {
    res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    return;
  }

  sendSuccess(res, { user: fullUser });
}

/**
 * PUT /api/auth/me
 * Met à jour le profil de l'utilisateur connecté
 */
export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const { displayName, phone, currentPassword, newPassword } = req.body;

    const result = await authService.updateProfile(userId, {
      displayName,
      phone,
      currentPassword,
      newPassword,
    });

    sendSuccess(res, { user: result }, 'Profil mis à jour');
  } catch (error) {
    next(error);
  }
}

// ============================================
// OAUTH CONTROLLERS
// ============================================

/**
 * POST /api/auth/oauth/google
 * Connexion/Inscription via Google OAuth
 */
export async function loginWithGoogle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken } = req.body;
    const result = await oauthService.loginWithGoogle(idToken);

    const message = result.isNewUser
      ? 'Compte créé et connexion réussie via Google'
      : 'Connexion réussie via Google';

    sendSuccess(res, result, message);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/oauth/link/google
 * Lier un compte Google à l'utilisateur connecté
 */
export async function linkGoogleAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { idToken } = req.body;
    await oauthService.linkGoogleAccount(req.user.id, idToken);

    sendSuccess(res, null, 'Compte Google lié avec succès');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/oauth/unlink/:provider
 * Délier un compte social de l'utilisateur connecté
 */
export async function unlinkSocialAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const provider = req.params.provider as OAuthProvider;
    await oauthService.unlinkSocialAccount(req.user.id, provider);

    sendSuccess(res, null, `Compte ${provider} délié avec succès`);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/oauth/accounts
 * Récupère les comptes sociaux liés à l'utilisateur connecté
 */
export async function getLinkedAccounts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accounts = await oauthService.getLinkedSocialAccounts(req.user.id);

    sendSuccess(res, { accounts });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/link-customer-code
 * Lie le compte de l'utilisateur connecté à un code client SAGE
 */
export async function linkToCustomerCode(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerCode } = req.body;
    const user = await oauthService.linkToCustomerCode(req.user.id, customerCode);

    sendSuccess(res, { user }, 'Compte lié au code client SAGE avec succès');
  } catch (error) {
    next(error);
  }
}

// ============================================
// EMAIL + PASSWORD LOGIN
// ============================================

/**
 * POST /api/auth/login/email
 * Connexion client par email + mot de passe
 */
export async function loginWithEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.loginWithEmail(email, password);

    sendSuccess(res, result, 'Connexion réussie');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/change-password
 * Change le mot de passe de l'utilisateur connecté
 * Si mustChangePassword est true, ne nécessite pas l'ancien mot de passe
 */
export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await authService.changePassword(req.user.id, newPassword, currentPassword);

    sendSuccess(res, { user }, 'Mot de passe modifié avec succès');
  } catch (error) {
    next(error);
  }
}
