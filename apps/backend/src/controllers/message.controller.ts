import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { broadcastTicketUpdate, broadcastAITyping, broadcastNewMessage, notifyHumanTakeover, broadcastHumanTakeoverToAdmins } from '../websocket/index.js';
import { notifyNewMessage } from '../services/notification.service.js';
import { AIService } from '../services/ai.service.js';

// ============================================
// CONTROLLER MESSAGES
// ============================================

/**
 * GET /api/tickets/:ticketId/messages
 * Liste les messages d'un ticket
 */
export async function getMessages(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const ticketId = req.params.ticketId as string;
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const cursor = req.query.cursor as string | undefined;

    // Vérifier accès au ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { customerId: true, assignedToId: true },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket non trouvé' });
      return;
    }

    // Vérifier permissions
    const { id: userId, role } = req.user;
    const canAccess =
      role === 'ADMIN' ||
      role === 'SUPERVISOR' ||
      (role === 'AGENT' && ticket.assignedToId === userId) ||
      (role === 'CUSTOMER' && ticket.customerId === userId);

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    // Les clients ne voient pas les notes internes
    const isCustomer = role === 'CUSTOMER';
    const whereClause = isCustomer
      ? { ticketId, isInternal: false }
      : { ticketId };

    // Récupérer les messages
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, displayName: true, role: true },
        },
        attachments: {
          select: { id: true, fileName: true, url: true, mimeType: true },
        },
      },
    });

    res.json({
      success: true,
      data: messages.reverse(), // Ordre chronologique
      meta: {
        count: messages.length,
        cursor: messages.length > 0 ? messages[0]?.id : null,
      },
    });
  } catch (error) {
    console.error('[Get Messages Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * POST /api/tickets/:ticketId/messages
 * Créer un message (REST alternatif au WebSocket)
 */
export async function createMessage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const ticketId = req.params.ticketId as string;
    const { content, isInternal = false, attachments = [] } = req.body;
    const { id: userId, role } = req.user;

    // Permettre message vide si des pièces jointes sont présentes
    const hasContent = content && content.trim().length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!hasContent && !hasAttachments) {
      res.status(400).json({ success: false, error: 'Contenu ou pièce jointe requis' });
      return;
    }

    // Seul le staff peut créer des notes internes
    const isStaff = ['ADMIN', 'SUPERVISOR', 'AGENT'].includes(role);
    const finalIsInternal = isStaff ? Boolean(isInternal) : false;

    // Vérifier ticket existe et récupérer les infos pour les notifications
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { id: true, displayName: true } },
        assignedTo: { select: { id: true, displayName: true } },
      },
    });

    if (!ticket) {
      res.status(404).json({ success: false, error: 'Ticket non trouvé' });
      return;
    }

    // Créer le message
    const message = await prisma.chatMessage.create({
      data: {
        ticketId,
        authorId: userId,
        content: hasContent ? content.trim() : '',
        isInternal: finalIsInternal,
      },
      include: {
        author: {
          select: { id: true, displayName: true, role: true },
        },
      },
    });

    // Lier les pièces jointes au message
    let linkedAttachments: Array<{ id: string; fileName: string; url: string; mimeType: string }> = [];
    if (hasAttachments) {
      await prisma.attachment.updateMany({
        where: {
          id: { in: attachments },
        },
        data: {
          messageId: message.id,
          context: 'MESSAGE',
        },
      });

      // Récupérer les pièces jointes liées pour les inclure dans la réponse
      linkedAttachments = await prisma.attachment.findMany({
        where: { messageId: message.id },
        select: { id: true, fileName: true, url: true, mimeType: true },
      });
    }

    // Mettre à jour le ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Préparer la réponse avec les pièces jointes
    const messageWithAttachments = {
      ...message,
      attachments: linkedAttachments,
    };

    // Broadcast via WebSocket (ne pas broadcaster les notes internes au client)
    if (!finalIsInternal) {
      broadcastNewMessage(ticketId, {
        id: message.id,
        authorId: message.author.id,
        authorName: message.author.displayName,
        content: message.content,
        isInternal: message.isInternal,
        createdAt: message.createdAt.toISOString(),
        attachments: linkedAttachments,
      });
    }

    // ============================================
    // ENVOI DES NOTIFICATIONS
    // ============================================
    const senderName = message.author.displayName || 'Utilisateur';

    // Si le message n'est pas interne
    if (!finalIsInternal) {
      // Si l'expéditeur est un membre du staff -> notifier le client
      if (isStaff && ticket.customerId && ticket.customerId !== userId) {
        await notifyNewMessage(
          ticketId,
          message.id,
          ticket.customerId,
          senderName,
          ticket.title
        );
      }

      // Si l'expéditeur est le client -> notifier l'agent assigné
      if (role === 'CUSTOMER' && ticket.assignedToId) {
        await notifyNewMessage(
          ticketId,
          message.id,
          ticket.assignedToId,
          senderName,
          ticket.title
        );
      }
    }

    // ============================================
    // RÉPONSE AUTOMATIQUE IA (pour les clients)
    // ============================================
    if (role === 'CUSTOMER') {
      // Déclencher l'IA en arrière-plan (ne pas bloquer la réponse)
      triggerAIResponse(ticketId).catch(err => {
        console.error('[AI Auto-Response Error]', err);
      });
    }

    res.status(201).json({
      success: true,
      data: messageWithAttachments,
    });
  } catch (error) {
    console.error('[Create Message Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * PUT /api/messages/:id/read
 * Marquer un message comme lu
 */
export async function markAsRead(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { id: userId } = req.user;

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      select: { readBy: true },
    });

    if (!message) {
      res.status(404).json({ success: false, error: 'Message non trouvé' });
      return;
    }

    const readBy = (message.readBy as Record<string, string>) || {};
    readBy[userId] = new Date().toISOString();

    await prisma.chatMessage.update({
      where: { id },
      data: { readBy },
    });

    res.json({ success: true, message: 'Message marqué comme lu' });
  } catch (error) {
    console.error('[Mark Read Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

// ============================================
// FONCTION HELPER: Réponse automatique IA
// ============================================

/**
 * Déclenche une réponse automatique de l'IA pour un ticket
 * Exécutée en arrière-plan après qu'un client envoie un message
 */
async function triggerAIResponse(ticketId: string): Promise<void> {
  try {
    // Petit délai pour que le message du client soit bien enregistré
    await new Promise(resolve => setTimeout(resolve, 500));

    // Récupérer le contexte du ticket
    // L'IA répond TOUJOURS en premier niveau, même si un agent humain est assigné
    // Elle complète l'agent humain, elle ne le remplace pas
    const context = await AIService.getTicketContext(ticketId);
    if (!context) {
      console.log(`[AI] Ticket ${ticketId} non trouvé`);
      return;
    }

    // Notifier que l'IA est en train d'écrire
    broadcastAITyping(ticketId, true);

    // Générer la réponse IA
    console.log(`[AI] Génération réponse pour ticket #${context.ticketNumber}...`);
    const response = await AIService.generateResponse(context);

    // Arrêter l'indicateur de frappe
    broadcastAITyping(ticketId, false);

    if (!response.success) {
      console.error(`[AI] Échec génération pour ticket ${ticketId}`);
      return;
    }

    // Sauvegarder la réponse IA
    await AIService.saveAIMessage(ticketId, response.message, {
      confidence: response.confidence,
      shouldEscalate: response.shouldEscalate,
      generatedAt: new Date().toISOString(),
      auto: true,
    });

    // Récupérer le message IA créé pour le broadcast
    const aiMessage = await prisma.chatMessage.findFirst({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, displayName: true, role: true },
        },
      },
    });

    if (aiMessage) {
      // Broadcast via WebSocket
      broadcastNewMessage(ticketId, {
        id: aiMessage.id,
        authorId: aiMessage.author?.id,
        authorName: aiMessage.author?.displayName || 'Assistant IA KLY',
        content: aiMessage.content,
        isInternal: false,
        createdAt: aiMessage.createdAt.toISOString(),
        attachments: [],
        isAI: true,
        offerHumanHelp: response.offerHumanHelp,
      });
    }

    console.log(`[AI] Réponse envoyée pour ticket #${context.ticketNumber} (confiance: ${response.confidence}%, offerHuman: ${response.offerHumanHelp})`);

    // ============================================
    // EXTRACTION AUTOMATIQUE D'INFORMATIONS
    // ============================================
    // Pour les tickets techniques, extraire les infos d'équipement de la conversation
    if (context.issueType === 'TECHNICAL') {
      const extractedInfo = AIService.extractEquipmentInfo(context.conversationHistory);

      if (Object.keys(extractedInfo).length > 0) {
        console.log(`[AI] Informations extraites:`, extractedInfo);

        const updated = await AIService.updateTicketWithExtractedInfo(ticketId, extractedInfo);

        if (updated) {
          // Notifier le frontend que le ticket a été mis à jour
          broadcastTicketUpdate(ticketId, 'equipmentInfo', extractedInfo);
        }
      }
    }

    // Si l'IA recommande une escalade, notifier l'agent assigné ou tous les admins
    if (response.shouldEscalate) {
      console.log(`[AI] Escalade recommandée pour ticket #${context.ticketNumber}`);

      // Récupérer le ticket pour avoir l'agent assigné
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          ticketNumber: true,
          assignedToId: true,
          contactName: true,
          companyName: true,
          customer: { select: { displayName: true } },
        },
      });

      if (ticket) {
        const customerName = ticket.contactName || ticket.companyName || ticket.customer?.displayName || 'Client';
        const takeoverData = {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber.toString(),
          customerName,
          message: 'L\'assistant IA recommande une prise en charge humaine',
        };

        // Si un agent est assigné, le notifier directement
        if (ticket.assignedToId) {
          notifyHumanTakeover(ticket.assignedToId, takeoverData);
        } else {
          // Sinon, notifier tous les admins/superviseurs
          broadcastHumanTakeoverToAdmins(takeoverData);
        }
      }
    }

    // ============================================
    // CLÔTURE AUTOMATIQUE DU TICKET PAR L'IA
    // ============================================
    if (response.shouldCloseTicket) {
      console.log(`[AI] Clôture automatique du ticket #${context.ticketNumber} - Le client a confirmé la résolution`);

      // Mettre à jour le statut du ticket
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      // Notifier via WebSocket
      broadcastTicketUpdate(ticketId, 'status', 'RESOLVED');

      // Ajouter une entrée dans l'historique
      await prisma.ticketHistory.create({
        data: {
          ticketId,
          action: 'STATUS_CHANGED',
          field: 'status',
          oldValue: context.status,
          newValue: 'RESOLVED',
        },
      });

      console.log(`[AI] Ticket #${context.ticketNumber} clôturé automatiquement`);
    }

  } catch (error) {
    // S'assurer que l'indicateur de frappe est arrêté en cas d'erreur
    broadcastAITyping(ticketId, false);
    console.error('[AI Auto-Response Error]', error);
  }
}
