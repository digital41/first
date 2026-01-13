import { TokenStorage } from './api';
import { Notification, Ticket, TicketMessage } from '../types';

// ============================================
// CONFIGURATION
// ============================================

// Convertir http:// en ws:// et https:// en wss://
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const SOCKET_URL = rawSocketUrl.replace(/^http/, 'ws');

// ============================================
// TYPES WEBSOCKET
// ============================================

export type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'notification'
  | 'ticket:created'
  | 'ticket:updated'
  | 'message:new'
  | 'user:typing'
  | 'user:online'
  | 'user:offline';

export interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onNotification?: (notification: Notification) => void;
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  onNewMessage?: (message: TicketMessage) => void;
  onUserTyping?: (data: { userId: string; ticketId: string }) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

// ============================================
// SERVICE WEBSOCKET
// ============================================

class SocketService {
  private socket: WebSocket | null = null;
  private handlers: SocketEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: string[] = [];

  /**
   * Initialise la connexion WebSocket
   */
  connect(handlers: SocketEventHandlers = {}): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.handlers = handlers;
    this.isConnecting = true;

    const token = TokenStorage.getAccessToken();
    const url = token ? `${SOCKET_URL}?token=${token}` : SOCKET_URL;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('🔌 WebSocket connecté');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Envoyer les messages en attente
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.socket?.send(msg);
        }

        this.handlers.onConnect?.();
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket déconnecté:', event.reason);
        this.isConnecting = false;
        this.handlers.onDisconnect?.(event.reason);

        // Tenter une reconnexion automatique
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Tentative de reconnexion dans ${delay}ms...`);
          setTimeout(() => this.connect(this.handlers), delay);
        }
      };

      this.socket.onerror = (error) => {
        console.error('🔌 WebSocket erreur:', error);
        this.handlers.onError?.(new Error('WebSocket error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };
    } catch (error) {
      console.error('Erreur création WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Gère les messages entrants
   */
  private handleMessage(data: { event: string; payload: unknown }): void {
    switch (data.event) {
      case 'notification':
        this.handlers.onNotification?.(data.payload as Notification);
        break;
      case 'ticket:created':
        this.handlers.onTicketCreated?.(data.payload as Ticket);
        break;
      case 'ticket:updated':
        this.handlers.onTicketUpdated?.(data.payload as Ticket);
        break;
      case 'message:new':
        this.handlers.onNewMessage?.(data.payload as TicketMessage);
        break;
      case 'user:typing':
        this.handlers.onUserTyping?.(data.payload as { userId: string; ticketId: string });
        break;
      case 'user:online':
        this.handlers.onUserOnline?.(data.payload as string);
        break;
      case 'user:offline':
        this.handlers.onUserOffline?.(data.payload as string);
        break;
      default:
        console.log('Event WebSocket non géré:', data.event);
    }
  }

  /**
   * Envoie un message via WebSocket
   */
  send(event: string, payload: unknown): void {
    const message = JSON.stringify({ event, payload });

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      // File d'attente si non connecté
      this.messageQueue.push(message);
    }
  }

  /**
   * Rejoint une room de ticket (pour recevoir les mises à jour)
   */
  joinTicketRoom(ticketId: string): void {
    this.send('ticket:join', { ticketId });
  }

  /**
   * Quitte une room de ticket
   */
  leaveTicketRoom(ticketId: string): void {
    this.send('ticket:leave', { ticketId });
  }

  /**
   * Indique que l'utilisateur est en train de taper
   */
  sendTyping(ticketId: string): void {
    this.send('user:typing', { ticketId });
  }

  /**
   * Marque les messages comme lus
   */
  markAsRead(ticketId: string, messageIds: string[]): void {
    this.send('messages:read', { ticketId, messageIds });
  }

  /**
   * Déconnecte le WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageQueue = [];
    this.reconnectAttempts = this.maxReconnectAttempts; // Empêche la reconnexion
  }

  /**
   * Vérifie si le socket est connecté
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Met à jour les handlers
   */
  updateHandlers(handlers: Partial<SocketEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }
}

// Export singleton
export const socketService = new SocketService();
export default socketService;
