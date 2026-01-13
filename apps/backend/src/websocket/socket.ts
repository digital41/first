import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { config } from '../config/index.js';
import { socketAuthMiddleware } from './auth.socket.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types.js';

// ============================================
// INSTANCE SOCKET.IO GLOBALE
// ============================================

let io: Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Initialise Socket.io sur le serveur HTTP
 */
export function initializeSocket(httpServer: HTTPServer): typeof io {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // ─────────────────────────────────────────
  // MIDDLEWARE AUTH
  // ─────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ─────────────────────────────────────────
  // CONNEXION
  // ─────────────────────────────────────────
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;

    console.log(
      `[Socket] Connected: ${authSocket.userDisplayName} (${authSocket.userId}) - Role: ${authSocket.userRole}`
    );

    // Joindre une room personnelle pour les notifications
    authSocket.join(`user:${authSocket.userId}`);

    // ─────────────────────────────────────────
    // ENREGISTRER LES HANDLERS
    // ─────────────────────────────────────────
    registerChatHandlers(io, authSocket);

    // ─────────────────────────────────────────
    // PRESENCE
    // ─────────────────────────────────────────
    authSocket.on('presence:online', () => {
      console.log(`[Socket] ${authSocket.userDisplayName} is online`);
    });

    authSocket.on('presence:offline', () => {
      console.log(`[Socket] ${authSocket.userDisplayName} is offline`);
    });

    // ─────────────────────────────────────────
    // DÉCONNEXION
    // ─────────────────────────────────────────
    authSocket.on('disconnect', (reason) => {
      console.log(
        `[Socket] Disconnected: ${authSocket.userDisplayName} - Reason: ${reason}`
      );
    });

    // ─────────────────────────────────────────
    // ERREURS
    // ─────────────────────────────────────────
    authSocket.on('error', (error) => {
      console.error(`[Socket] Error for ${authSocket.userDisplayName}:`, error);
    });
  });

  console.log('[Socket.io] Initialized');

  return io;
}

/**
 * Récupère l'instance Socket.io
 * À utiliser dans les services/controllers pour émettre des events
 */
export function getIO(): typeof io {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

// ============================================
// HELPERS POUR ÉMETTRE DEPUIS LE BACKEND
// ============================================

/**
 * Envoie une notification à un utilisateur spécifique
 */
export function sendNotificationToUser(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    ticketId?: string;
    createdAt: string;
  }
): void {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Envoie une mise à jour de ticket à tous les membres de la room
 */
export function broadcastTicketUpdate(
  ticketId: string,
  field: string,
  value: unknown
): void {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit('ticket:updated', { ticketId, field, value });
}

/**
 * Notifie l'assignation d'un ticket
 */
export function broadcastTicketAssigned(
  ticketId: string,
  agentId: string,
  agentName: string
): void {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit('ticket:assigned', {
    ticketId,
    agentId,
    agentName,
  });
}

export { io };
