import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// ============================================
// MIDDLEWARE: Validation des requêtes avec Zod
// ============================================

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Valide le body, query ou params d'une requête
 * Usage: validate({ body: createTicketSchema })
 */
export function validate(schemas: ValidationSchemas) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Données de requête invalides',
          details: errors,
        });
        return;
      }
      next(error);
    }
  };
}

// ============================================
// SCHÉMAS DE VALIDATION RÉUTILISABLES
// ============================================

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ID CUID
export const cuidSchema = z.object({
  id: z.string().cuid(),
});

// Authentification par code compte client SAGE 100
export const loginByCustomerCodeSchema = z.object({
  customerCode: z.string().min(1, 'Le code client est requis'),
});

// Authentification par références SAGE 100 (ancienne méthode)
export const loginByReferenceSchema = z
  .object({
    orderNumber: z.string().min(1).optional(),  // BC - Bon de Commande
    blNumber: z.string().min(1).optional(),     // BL - Bon de Livraison
    faNumber: z.string().min(1).optional(),     // FA - Facture
  })
  .refine(
    (data) => data.orderNumber || data.blNumber || data.faNumber,
    { message: 'Au moins une référence (BC, BL ou FA) est requise' }
  );

// Authentification admin
export const adminLoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
});

// Création de ticket
export const createTicketSchema = z.object({
  orderId: z.string().cuid().optional(),
  title: z.string().min(5, 'Titre trop court').max(200),
  description: z.string().max(5000).optional(),
  issueType: z.enum(['TECHNICAL', 'DELIVERY', 'BILLING', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tags: z.array(z.string()).optional(),
});

// Mise à jour de ticket
export const updateTicketSchema = z.object({
  status: z
    .enum([
      'OPEN',
      'IN_PROGRESS',
      'WAITING_CUSTOMER',
      'RESOLVED',
      'CLOSED',
      'ESCALATED',
      'REOPENED',
    ])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().cuid().optional().nullable(),
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

// Refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

// OAuth Google
export const googleOAuthSchema = z.object({
  idToken: z.string().min(1, 'Token Google requis'),
});

// OAuth provider param
export const oauthProviderSchema = z.object({
  provider: z.enum(['GOOGLE', 'MICROSOFT', 'APPLE']),
});

// Email + Password login
export const emailLoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// Change password
export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
});
