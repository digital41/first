import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';

// ============================================
// CLASSE D'ERREUR PERSONNALISÉE
// ============================================

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(400, message);
  }

  static unauthorized(message = 'Non autorisé'): AppError {
    return new AppError(401, message);
  }

  static forbidden(message = 'Accès interdit'): AppError {
    return new AppError(403, message);
  }

  static notFound(message = 'Ressource non trouvée'): AppError {
    return new AppError(404, message);
  }

  static conflict(message: string): AppError {
    return new AppError(409, message);
  }

  static internal(message = 'Erreur interne du serveur'): AppError {
    return new AppError(500, message, false);
  }
}

// ============================================
// MIDDLEWARE: Gestionnaire d'erreurs global
// ============================================

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log l'erreur en développement
  if (config.isDevelopment) {
    console.error('🔴 Error:', err);
  }

  // Erreur de validation Zod
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: errors,
    });
    return;
  }

  // Erreur applicative
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(config.isDevelopment && !err.isOperational && { stack: err.stack }),
    });
    return;
  }

  // Erreur Prisma - Contrainte unique violée
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: `Cette valeur existe déjà: ${prismaError.meta?.target?.join(', ')}`,
      });
      return;
    }
  }

  // Erreur inattendue
  res.status(500).json({
    success: false,
    error: config.isProduction
      ? 'Une erreur inattendue est survenue'
      : err.message,
    ...(config.isDevelopment && { stack: err.stack }),
  });
};

// ============================================
// MIDDLEWARE: Route non trouvée
// ============================================

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route non trouvée: ${req.method} ${req.originalUrl}`,
  });
}
