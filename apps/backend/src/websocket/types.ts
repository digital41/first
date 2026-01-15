import type { Socket } from 'socket.io';

// ============================================
// TYPES SOCKET.IO
// ============================================

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
  userDisplayName: string;
}

// Events Client → Serveur
export interface ClientToServerEvents {
  // Chat
  'chat:join': (ticketId: string) => void;
  'chat:leave': (ticketId: string) => void;
  'chat:message': (data: { ticketId: string; content: string }) => void;
  'chat:typing': (data: { ticketId: string; isTyping: boolean }) => void;
  'chat:read': (data: { ticketId: string; messageIds: string[] }) => void;

  // Ticket room (alias pour compatibilité frontend)
  'join:ticket': (data: { ticketId: string }) => void;
  'leave:ticket': (data: { ticketId: string }) => void;

  // Presence
  'presence:online': () => void;
  'presence:offline': () => void;
}

// Events Serveur → Client
export interface ServerToClientEvents {
  // Chat
  'chat:message': (data: ChatMessagePayload) => void;
  'chat:typing': (data: { ticketId: string; userId: string; displayName: string; isTyping: boolean }) => void;
  'chat:read': (data: { ticketId: string; userId: string; messageIds: string[] }) => void;
  'chat:history': (data: { ticketId: string; messages: ChatMessagePayload[] }) => void;

  // Messages (compatible avec frontend)
  'message:new': (data: {
    id: string;
    authorId?: string;
    authorName?: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
    attachments?: Array<{ id: string; fileName: string; url: string; mimeType?: string }>;
    isAI?: boolean;
    offerHumanHelp?: boolean;
  }) => void;

  // AI
  'ai:typing': (data: { ticketId: string; isTyping: boolean }) => void;

  // Ticket updates
  'ticket:updated': (data: { ticketId: string; field: string; value: unknown }) => void;
  'ticket:assigned': (data: { ticketId: string; agentId: string; agentName: string }) => void;

  // Notifications
  'notification': (data: NotificationPayload) => void;

  // Admin events
  'admin:human_takeover': (data: {
    ticketId: string;
    ticketNumber: string;
    customerName: string;
    message?: string;
  }) => void;

  // Errors
  'error': (data: { code: string; message: string }) => void;
}

// Events inter-serveurs (scalabilité)
export interface InterServerEvents {
  ping: () => void;
}

// Données socket
export interface SocketData {
  userId: string;
  userRole: string;
  userDisplayName: string;
}

// ============================================
// PAYLOADS
// ============================================

export interface ChatMessagePayload {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  attachments?: { id: string; fileName: string; url: string }[];
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  ticketId?: string;
  createdAt: string;
}
