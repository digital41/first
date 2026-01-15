import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { AIService, GlobalAIAssistant } from '../services/ai.service.js';

// ============================================
// CONTROLLER ASSISTANT IA OPÉRATEUR
// ============================================

/**
 * POST /api/admin/ai/suggest/:ticketId
 * Génère une suggestion de réponse pour l'opérateur
 */
export async function getAISuggestion(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const ticketId = req.params.ticketId as string;
    const { query } = req.body as { query?: string };

    // Récupérer le contexte du ticket
    const context = await AIService.getTicketContext(ticketId);

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Ticket non trouvé',
      });
      return;
    }

    console.log(`[AI Assistant] Génération suggestion pour ticket #${context.ticketNumber} par ${req.user.email}`);

    // Générer la suggestion
    const suggestion = await AIService.generateOperatorSuggestion(context, query);

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    console.error('[AI Suggestion Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la suggestion',
    });
  }
}

/**
 * POST /api/admin/ai/analyze/:ticketId
 * Analyse rapide du ticket sans brouillon
 */
export async function analyzeTicket(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
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

    // Analyse rapide
    const customerMessages = context.conversationHistory.filter(m => m.role === 'customer');
    const lastCustomerMessage = customerMessages.slice(-1)[0]?.content.toLowerCase() || '';

    // Déterminer le sentiment
    let sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' = 'neutral';
    if (lastCustomerMessage.includes('merci') || lastCustomerMessage.includes('super')) {
      sentiment = 'positive';
    } else if (lastCustomerMessage.includes('urgent') || lastCustomerMessage.includes('inadmissible')) {
      sentiment = 'frustrated';
    } else if (lastCustomerMessage.includes('problème') || lastCustomerMessage.includes('ne fonctionne pas')) {
      sentiment = 'negative';
    }

    // Évaluer l'urgence
    let urgency = 'normal';
    if (context.priority === 'URGENT') {
      urgency = 'critical';
    } else if (context.priority === 'HIGH') {
      urgency = 'high';
    } else if (customerMessages.length >= 3) {
      urgency = 'attention';
    }

    // Informations extraites
    const extractedInfo = AIService.extractEquipmentInfo(context.conversationHistory);

    res.json({
      success: true,
      data: {
        ticketNumber: context.ticketNumber,
        issueType: context.issueType,
        priority: context.priority,
        sentiment,
        urgency,
        messageCount: context.conversationHistory.length,
        customerMessageCount: customerMessages.length,
        extractedInfo,
        lastCustomerMessage: customerMessages.slice(-1)[0]?.content || null,
      },
    });
  } catch (error) {
    console.error('[AI Analyze Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse',
    });
  }
}

/**
 * POST /api/admin/ai/summary/:ticketId
 * Génère un résumé intelligent de la conversation
 */
export async function getConversationSummary(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
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

    console.log(`[AI Summary] Génération résumé pour ticket #${context.ticketNumber} par ${req.user.email}`);

    // Générer le résumé IA
    const summary = await AIService.generateConversationSummary(context);

    res.json({
      success: true,
      data: {
        ticketNumber: context.ticketNumber,
        ...summary,
      },
    });
  } catch (error) {
    console.error('[AI Summary Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du résumé',
    });
  }
}

/**
 * POST /api/admin/ai/chat
 * Chat conversationnel avec l'assistant IA global
 */
export async function chatWithGlobalAssistant(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { message, conversationHistory } = req.body as {
      message: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Le message est requis',
      });
      return;
    }

    console.log(`[AI Global Assistant] Question de ${req.user.email}: ${message.slice(0, 50)}...`);

    // Récupérer le contexte global
    const context = await GlobalAIAssistant.getGlobalContext();

    // Générer la réponse
    const response = await GlobalAIAssistant.generateResponse(
      message,
      context,
      conversationHistory || []
    );

    res.json({
      success: true,
      data: {
        message: response.message,
        context: {
          totalTickets: context.totalTickets,
          slaBreached: context.slaBreached,
          unassignedCount: context.unassignedCount,
          urgentCount: context.byPriority.URGENT || 0,
        },
      },
    });
  } catch (error) {
    console.error('[AI Global Chat Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la communication avec l\'assistant',
    });
  }
}
