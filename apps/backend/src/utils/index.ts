import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';

// ============================================
// UTILITAIRES DE RÉPONSE API
// ============================================

/**
 * Envoie une réponse de succès standardisée
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
}

/**
 * Envoie une réponse paginée
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number; totalPages: number }
): void {
  res.status(200).json({
    success: true,
    data,
    meta,
  });
}

/**
 * Envoie une réponse d'erreur standardisée
 */
export function sendError(
  res: Response,
  error: string,
  statusCode = 400
): void {
  res.status(statusCode).json({
    success: false,
    error,
  });
}

// ============================================
// UTILITAIRES DIVERS
// ============================================

/**
 * Pause asynchrone (pour rate limiting manuel, tests, etc.)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nettoie un objet des valeurs undefined
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Formate une date en français
 */
export function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}
