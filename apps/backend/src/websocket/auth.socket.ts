import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import type { AuthenticatedSocket } from './types.js';

// ============================================
// MIDDLEWARE AUTH JWT POUR SOCKET.IO
// ============================================

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Middleware d'authentification Socket.io
 * Vérifie le token JWT passé dans auth.token ou query.token
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Récupérer le token depuis handshake
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('AUTH_TOKEN_REQUIRED'));
    }

    // Vérifier le JWT
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return next(new Error('AUTH_TOKEN_EXPIRED'));
      }
      return next(new Error('AUTH_TOKEN_INVALID'));
    }

    // Vérifier que l'utilisateur existe et est actif
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        displayName: true,
        role: true,
      },
    });

    if (!user) {
      return next(new Error('AUTH_USER_NOT_FOUND'));
    }

    // Attacher les infos user au socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = user.id;
    authSocket.userRole = user.role;
    authSocket.userDisplayName = user.displayName;

    // Mettre à jour lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    next();
  } catch (error) {
    console.error('[Socket Auth Error]', error);
    next(new Error('AUTH_INTERNAL_ERROR'));
  }
}

/**
 * Vérifie si un socket a accès à un ticket
 */
export async function canAccessTicket(
  socket: AuthenticatedSocket,
  ticketId: string
): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      customerId: true,
      assignedToId: true,
    },
  });

  if (!ticket) {
    return false;
  }

  // Admin et Supervisor ont accès à tout
  if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPERVISOR') {
    return true;
  }

  // Agent assigné a accès
  if (socket.userRole === 'AGENT' && ticket.assignedToId === socket.userId) {
    return true;
  }

  // Customer propriétaire a accès
  if (socket.userRole === 'CUSTOMER' && ticket.customerId === socket.userId) {
    return true;
  }

  return false;
}
