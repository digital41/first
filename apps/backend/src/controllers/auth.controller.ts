import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/index.js';
import type { AuthenticatedRequest } from '../types/index.js';

// ============================================
// CONTROLLER D'AUTHENTIFICATION
// ============================================

/**
 * POST /api/auth/login
 * Connexion client par références commande
 */
export async function loginByReference(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { orderNumber } = req.body;
    const result = await authService.loginByReference(orderNumber);

    sendSuccess(res, result, 'Connexion réussie');
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
 * Retourne les infos de l'utilisateur connecté
 */
export async function me(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  sendSuccess(res, { user: req.user });
}
