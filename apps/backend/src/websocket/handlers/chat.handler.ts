import type { Server } from 'socket.io';
import { prisma } from '../../config/database.js';
import { canAccessTicket } from '../auth.socket.js';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
} from '../types.js';

// ============================================
// HANDLER CHAT - Events par ticket
// ============================================

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Enregistre les handlers de chat sur un socket authentifié
 */
export function registerChatHandlers(
  io: IOServer,
  socket: AuthenticatedSocket
): void {
  // ─────────────────────────────────────────
  // JOIN: Rejoindre une room de ticket
  // ─────────────────────────────────────────
  socket.on('chat:join', async (ticketId: string) => {
    try {
      // Vérifier accès
      const hasAccess = await canAccessTicket(socket, ticketId);
      if (!hasAccess) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'Accès au ticket refusé',
        });
        return;
      }

      // Rejoindre la room
      const room = `ticket:${ticketId}`;
      await socket.join(room);

      console.log(`[Socket] ${socket.userDisplayName} joined ${room}`);

      // Charger et envoyer l'historique des messages
      const messages = await prisma.chatMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              url: true,
            },
          },
        },
      });

      const history: ChatMessagePayload[] = messages.map((msg) => ({
        id: msg.id,
        ticketId: msg.ticketId,
        authorId: msg.author.id,
        authorName: msg.author.displayName,
        authorRole: msg.author.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        attachments: msg.attachments,
      }));

      socket.emit('chat:history', { ticketId, messages: history });
    } catch (error) {
      console.error('[Socket] chat:join error:', error);
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la connexion au chat',
      });
    }
  });

  // ─────────────────────────────────────────
  // LEAVE: Quitter une room de ticket
  // ─────────────────────────────────────────
  socket.on('chat:leave', async (ticketId: string) => {
    const room = `ticket:${ticketId}`;
    await socket.leave(room);
    console.log(`[Socket] ${socket.userDisplayName} left ${room}`);
  });

  // ─────────────────────────────────────────
  // MESSAGE: Envoyer un message
  // ─────────────────────────────────────────
  socket.on('chat:message', async ({ ticketId, content }) => {
    try {
      // Vérifier accès
      const hasAccess = await canAccessTicket(socket, ticketId);
      if (!hasAccess) {
        socket.emit('error', {
          code: 'FORBIDDEN',
          message: 'Accès au ticket refusé',
        });
        return;
      }

      // Valider contenu
      if (!content || content.trim().length === 0) {
        socket.emit('error', {
          code: 'INVALID_MESSAGE',
          message: 'Le message ne peut pas être vide',
        });
        return;
      }

      // Créer le message en BDD
      const message = await prisma.chatMessage.create({
        data: {
          ticketId,
          authorId: socket.userId,
          content: content.trim(),
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
        },
      });

      // Mettre à jour le ticket (updatedAt)
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      // Construire le payload
      const payload: ChatMessagePayload = {
        id: message.id,
        ticketId: message.ticketId,
        authorId: message.author.id,
        authorName: message.author.displayName,
        authorRole: message.author.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      };

      // Broadcast à toute la room (y compris l'émetteur)
      io.to(`ticket:${ticketId}`).emit('chat:message', payload);

      console.log(`[Socket] Message in ticket:${ticketId} by ${socket.userDisplayName}`);
    } catch (error) {
      console.error('[Socket] chat:message error:', error);
      socket.emit('error', {
        code: 'INTERNAL_ERROR',
        message: "Erreur lors de l'envoi du message",
      });
    }
  });

  // ─────────────────────────────────────────
  // TYPING: Indicateur de frappe
  // ─────────────────────────────────────────
  socket.on('chat:typing', async ({ ticketId, isTyping }) => {
    const room = `ticket:${ticketId}`;

    // Broadcast aux autres membres de la room
    socket.to(room).emit('chat:typing', {
      ticketId,
      userId: socket.userId,
      displayName: socket.userDisplayName,
      isTyping,
    });
  });

  // ─────────────────────────────────────────
  // READ: Marquer des messages comme lus
  // ─────────────────────────────────────────
  socket.on('chat:read', async ({ ticketId, messageIds }) => {
    try {
      // Mettre à jour readBy en JSON (merge)
      for (const messageId of messageIds) {
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId },
          select: { readBy: true },
        });

        const readBy = (message?.readBy as Record<string, string>) || {};
        readBy[socket.userId] = new Date().toISOString();

        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { readBy },
        });
      }

      // Notifier la room
      const room = `ticket:${ticketId}`;
      socket.to(room).emit('chat:read', {
        ticketId,
        userId: socket.userId,
        messageIds,
      });
    } catch (error) {
      console.error('[Socket] chat:read error:', error);
    }
  });
}
