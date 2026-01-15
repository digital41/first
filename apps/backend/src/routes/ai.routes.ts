// ============================================
// ROUTES IA - Endpoints pour l'assistant IA
// ============================================

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { AIService } from '../services/ai.service.js';
import { authenticate, requireStaff } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Tous les endpoints requièrent une authentification
router.use(authenticate as unknown as RequestHandler);

// ============================================
// POST /ai/generate - Générer une réponse IA pour un ticket
// ============================================

const generateSchema = z.object({
  ticketId: z.string().min(1),
  autoSave: z.boolean().optional().default(false), // Sauvegarder automatiquement le message
});

router.post('/generate', (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ticketId, autoSave } = generateSchema.parse(req.body);

    // Récupérer le contexte du ticket
    const context = await AIService.getTicketContext(ticketId);

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    // Générer la réponse IA
    const response = await AIService.generateResponse(context);

    // Sauvegarder si demandé
    if (autoSave && response.success) {
      await AIService.saveAIMessage(ticketId, response.message, {
        confidence: response.confidence,
        shouldEscalate: response.shouldEscalate,
        generatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        message: response.message,
        shouldEscalate: response.shouldEscalate,
        confidence: response.confidence,
        suggestedActions: response.suggestedActions,
        saved: autoSave,
      },
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// ============================================
// POST /ai/respond/:ticketId - Répondre automatiquement à un ticket
// ============================================

router.post('/respond/:ticketId', (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;

    // Récupérer le contexte du ticket
    const context = await AIService.getTicketContext(ticketId);

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    // Générer la réponse IA
    const response = await AIService.generateResponse(context);

    if (!response.success) {
      res.status(500).json({
        success: false,
        error: 'Erreur génération réponse IA',
      });
      return;
    }

    // Sauvegarder le message IA
    await AIService.saveAIMessage(ticketId, response.message, {
      confidence: response.confidence,
      shouldEscalate: response.shouldEscalate,
      generatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        message: response.message,
        shouldEscalate: response.shouldEscalate,
        confidence: response.confidence,
        suggestedActions: response.suggestedActions,
      },
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// ============================================
// GET /ai/context/:ticketId - Récupérer le contexte IA d'un ticket
// ============================================

router.get('/context/:ticketId', requireStaff as unknown as RequestHandler, (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;

    const context = await AIService.getTicketContext(ticketId);

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: context,
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

// ============================================
// POST /ai/analyze - Analyser un message client
// ============================================

const analyzeSchema = z.object({
  ticketId: z.string().min(1),
  customerMessage: z.string().min(1),
});

router.post('/analyze', requireStaff as unknown as RequestHandler, (async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ticketId, customerMessage } = analyzeSchema.parse(req.body);

    const context = await AIService.getTicketContext(ticketId);

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    // Ajouter le message client au contexte pour l'analyse
    context.conversationHistory.push({
      role: 'customer',
      content: customerMessage,
      timestamp: new Date().toISOString(),
    });

    // Générer une suggestion de réponse
    const response = await AIService.generateResponse(context);

    res.json({
      success: true,
      data: {
        suggestedResponse: response.message,
        shouldEscalate: response.shouldEscalate,
        confidence: response.confidence,
        suggestedActions: response.suggestedActions,
      },
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

export default router;
