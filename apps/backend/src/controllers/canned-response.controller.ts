import type { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendSuccess } from '../utils/index.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { Prisma } from '@prisma/client';

// ============================================
// CONTROLLER CANNED RESPONSES (Réponses prédéfinies)
// ============================================

/**
 * GET /api/canned-responses
 * Liste toutes les réponses prédéfinies
 */
export async function listCannedResponses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const search = req.query.search as string | undefined;
    const tags = req.query.tags as string | undefined;

    const where: Prisma.CannedResponseWhereInput = {};

    // Filtrage par tags
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagArray };
    }

    // Recherche textuelle
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const responses = await prisma.cannedResponse.findMany({
      where,
      orderBy: { title: 'asc' },
      include: {
        _count: {
          select: { uses: true },
        },
      },
    });

    sendSuccess(res, { responses });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/canned-responses/:id
 * Détails d'une réponse prédéfinie
 */
export async function getCannedResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const response = await prisma.cannedResponse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { uses: true },
        },
      },
    });

    if (!response) {
      throw AppError.notFound('Réponse prédéfinie non trouvée');
    }

    sendSuccess(res, { response });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/canned-responses
 * Crée une réponse prédéfinie
 */
export async function createCannedResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, content, tags } = req.body;

    const response = await prisma.cannedResponse.create({
      data: {
        title,
        content,
        tags: tags || [],
      },
    });

    sendSuccess(res, { response }, 'Réponse prédéfinie créée', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/canned-responses/:id
 * Met à jour une réponse prédéfinie
 */
export async function updateCannedResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.cannedResponse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Réponse prédéfinie non trouvée');
    }

    const { title, content, tags } = req.body;

    const response = await prisma.cannedResponse.update({
      where: { id },
      data: {
        title,
        content,
        tags,
      },
    });

    sendSuccess(res, { response }, 'Réponse prédéfinie mise à jour');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/canned-responses/:id
 * Supprime une réponse prédéfinie
 */
export async function deleteCannedResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const existing = await prisma.cannedResponse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound('Réponse prédéfinie non trouvée');
    }

    await prisma.cannedResponse.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Réponse prédéfinie supprimée');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/canned-responses/:id/use
 * Enregistre l'utilisation d'une réponse prédéfinie
 */
export async function useCannedResponse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { ticketId } = req.body;

    const response = await prisma.cannedResponse.findUnique({
      where: { id },
    });

    if (!response) {
      throw AppError.notFound('Réponse prédéfinie non trouvée');
    }

    // Vérifie que le ticket existe
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw AppError.notFound('Ticket non trouvé');
    }

    // Enregistre l'utilisation
    await prisma.cannedResponseUse.create({
      data: {
        ticketId,
        cannedResponseId: id,
        usedById: req.user?.id,
      },
    });

    // Retourne le contenu pour insertion
    sendSuccess(res, { content: response.content });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/canned-responses/tags
 * Liste tous les tags utilisés
 */
export async function getCannedResponseTags(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const responses = await prisma.cannedResponse.findMany({
      select: { tags: true },
    });

    // Extraire les tags uniques
    const allTags = responses.flatMap((r) => r.tags);
    const uniqueTags = [...new Set(allTags)].sort();

    sendSuccess(res, { tags: uniqueTags });
  } catch (error) {
    next(error);
  }
}
