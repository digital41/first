import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { AuthenticatedRequest, JwtPayload } from '../types/index.js';
import type { UserRole } from '@prisma/client';

// ============================================
// MIDDLEWARE: Vérification JWT
// ============================================

/**
 * Vérifie que la requête contient un token JWT valide
 * Ajoute les infos utilisateur à req.user
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Token manquant. Authentification requise.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token invalide.',
    });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    if (payload.type !== 'access') {
      res.status(401).json({
        success: false,
        error: 'Type de token invalide.',
      });
      return;
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expiré. Veuillez vous reconnecter.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Token invalide.',
    });
  }
}

// ============================================
// MIDDLEWARE: Vérification des rôles
// ============================================

/**
 * Vérifie que l'utilisateur a un des rôles autorisés
 * À utiliser APRÈS authenticate()
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Permissions insuffisantes.',
      });
      return;
    }

    next();
  };
}

// ============================================
// RACCOURCIS PRATIQUES
// ============================================

/** Requiert le rôle ADMIN */
export const requireAdmin = requireRoles('ADMIN');

/** Requiert le rôle ADMIN ou SUPERVISOR */
export const requireSupervisor = requireRoles('ADMIN', 'SUPERVISOR');

/** Requiert le rôle ADMIN, SUPERVISOR ou AGENT (staff interne) */
export const requireStaff = requireRoles('ADMIN', 'SUPERVISOR', 'AGENT');

/** Requiert le rôle CUSTOMER uniquement (espace client) */
export const requireClient = requireRoles('CUSTOMER');

// ============================================
// MIDDLEWARE: Bloquer accès admin non autorisé
// ============================================

/**
 * Bloque strictement les accès non-staff aux routes admin
 * Retourne 403 Forbidden avec message explicite
 */
export function blockNonStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentification requise.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const staffRoles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT'];

  if (!staffRoles.includes(req.user.role)) {
    // Log tentative d'accès non autorisé
    console.warn(
      `[SECURITY] Tentative d'accès admin bloquée - User: ${req.user.id} (${req.user.role}) - Route: ${req.originalUrl}`
    );

    res.status(403).json({
      success: false,
      error: 'Accès interdit. Cette zone est réservée au personnel autorisé.',
      code: 'ADMIN_ACCESS_DENIED',
    });
    return;
  }

  next();
}

/**
 * Bloque strictement les accès staff aux routes client
 * (optionnel, pour séparer complètement les espaces)
 */
export function blockStaff(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentification requise.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const staffRoles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT'];

  if (staffRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Accès réservé aux clients. Utilisez l\'interface d\'administration.',
      code: 'CLIENT_ACCESS_ONLY',
    });
    return;
  }

  next();
}

// ============================================
// MIDDLEWARE: Auth optionnel
// ============================================

/**
 * Authentification optionnelle
 * Si un token est présent et valide, ajoute req.user
 * Sinon, continue sans erreur
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    if (payload.type === 'access') {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    }
  } catch {
    // Token invalide/expiré - on continue sans authentification
  }

  next();
}
