import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { broadcastTicketUpdate } from '../websocket/index.js';

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
    const { content, isInternal = false } = req.body;
    const { id: userId, role } = req.user;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Contenu requis' });
      return;
    }

    // Seul le staff peut créer des notes internes
    const isStaff = ['ADMIN', 'SUPERVISOR', 'AGENT'].includes(role);
    const finalIsInternal = isStaff ? Boolean(isInternal) : false;

    // Vérifier ticket existe
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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
        content: content.trim(),
        isInternal: finalIsInternal,
      },
      include: {
        author: {
          select: { id: true, displayName: true, role: true },
        },
      },
    });

    // Mettre à jour le ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Broadcast via WebSocket (ne pas broadcaster les notes internes au client)
    if (!finalIsInternal) {
      broadcastTicketUpdate(ticketId, 'newMessage', {
        id: message.id,
        authorId: message.author.id,
        authorName: message.author.displayName,
        content: message.content,
        isInternal: message.isInternal,
        createdAt: message.createdAt.toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      data: message,
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
