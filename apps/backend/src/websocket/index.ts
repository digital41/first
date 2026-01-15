// ============================================
// EXPORTS WEBSOCKET
// ============================================

export {
  initializeSocket,
  getIO,
  sendNotificationToUser,
  broadcastTicketUpdate,
  broadcastTicketAssigned,
  broadcastAITyping,
  broadcastNewMessage,
  notifyHumanTakeover,
  broadcastHumanTakeoverToAdmins,
  io,
} from './socket.js';

export type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
  NotificationPayload,
} from './types.js';
