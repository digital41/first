import type { Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';
import { sendSuccess } from '../utils/index.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { UserRole } from '@prisma/client';

// ============================================
// CONTROLLER UTILISATEURS
// ============================================

/**
 * GET /api/users
 * Liste les utilisateurs (admin/supervisor)
 */
export async function listUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role, search, page, limit } = req.query;

    const result = await userService.listUsers({
      role: role as UserRole | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/agents
 * Liste les agents disponibles pour assignation
 */
export async function getAvailableAgents(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const agents = await userService.getAvailableAgents();
    sendSuccess(res, { agents });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id
 * Détails d'un utilisateur
 */
export async function getUserById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await userService.getUserById(id);
    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id/stats
 * Statistiques d'un agent
 */
export async function getAgentStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const stats = await userService.getAgentStats(id);
    sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users
 * Crée un utilisateur (admin)
 */
export async function createUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userService.createUser(req.body);
    sendSuccess(res, { user }, 'Utilisateur créé', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id
 * Met à jour un utilisateur
 */
export async function updateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await userService.updateUser(id, req.body);
    sendSuccess(res, { user }, 'Utilisateur mis à jour');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Supprime un utilisateur
 */
export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    await userService.deleteUser(id);
    sendSuccess(res, null, 'Utilisateur supprimé');
  } catch (error) {
    next(error);
  }
}
