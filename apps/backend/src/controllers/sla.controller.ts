import type { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendSuccess } from '../utils/index.js';
import { AppError } from '../middlewares/error.middleware.js';
import { getSlaStats } from '../services/sla.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { TicketPriority, IssueType } from '@prisma/client';

// ============================================
// CONTROLLER SLA
// ============================================

/**
 * GET /api/sla/configs
 * Liste toutes les configurations SLA
 */
export async function listSlaConfigs(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const configs = await prisma.slaConfig.findMany({
      orderBy: [{ priority: 'asc' }, { issueType: 'asc' }],
    });

    sendSuccess(res, { configs });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sla/configs/:id
 * Détails d'une config SLA
 */
export async function getSlaConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const config = await prisma.slaConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw AppError.notFound('Configuration SLA non trouvée');
    }

    sendSuccess(res, { config });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sla/configs
 * Crée une configuration SLA
 */
export async function createSlaConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { priority, issueType, firstResponseTime, resolutionTime } = req.body;

    // Vérification unicité (la contrainte unique gère priority + issueType nullable)
    const existing = await prisma.slaConfig.findFirst({
      where: {
        priority: priority as TicketPriority,
        issueType: issueType ? (issueType as IssueType) : null,
      },
    });

    if (existing) {
      throw AppError.conflict('Une configuration existe déjà pour cette combinaison');
    }

    const config = await prisma.slaConfig.create({
      data: {
        priority: priority as TicketPriority,
        issueType: issueType ? (issueType as IssueType) : null,
        firstResponseTime: parseInt(firstResponseTime),
        resolutionTime: parseInt(resolutionTime),
      },
    });

    sendSuccess(res, { config }, 'Configuration SLA créée', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/sla/configs/:id
 * Met à jour une configuration SLA
 */
export async function updateSlaConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.slaConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Configuration SLA non trouvée');
    }

    const { firstResponseTime, resolutionTime } = req.body;

    const config = await prisma.slaConfig.update({
      where: { id },
      data: {
        firstResponseTime: firstResponseTime
          ? parseInt(firstResponseTime)
          : undefined,
        resolutionTime: resolutionTime
          ? parseInt(resolutionTime)
          : undefined,
      },
    });

    sendSuccess(res, { config }, 'Configuration SLA mise à jour');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/sla/configs/:id
 * Supprime une configuration SLA
 */
export async function deleteSlaConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.slaConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Configuration SLA non trouvée');
    }

    await prisma.slaConfig.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Configuration SLA supprimée');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sla/stats
 * Statistiques SLA
 */
export async function getSlaStatistics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const period = (req.query.period as 'day' | 'week' | 'month') || 'week';
    const stats = await getSlaStats(period);

    sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
}
