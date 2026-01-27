import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private pendingRooms: Set<string> = new Set(); // Rooms en attente de connexion

  connect(): void {
    const token = getAccessToken();
    if (!token) {
      console.log('[Socket] No token, cannot connect');
      return;
    }

    // Si déjà connecté, ne rien faire
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Si socket existe mais déconnecté, le fermer d'abord
    if (this.socket) {
      console.log('[Socket] Socket exists but disconnected, cleaning up');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('[Socket] Creating new connection to', SOCKET_URL);
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully! Socket ID:', this.socket?.id);
      // Re-register all listeners AFTER connection is established
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });
      console.log(`[Socket] Registered ${this.listeners.size} event types`);

      // Rejoindre les rooms en attente
      if (this.pendingRooms.size > 0) {
        console.log(`[Socket] Joining ${this.pendingRooms.size} pending rooms:`, Array.from(this.pendingRooms));
        this.pendingRooms.forEach((ticketId) => {
          this.socket?.emit('join:ticket', { ticketId });
          console.log(`[Socket] Emitted join:ticket for ${ticketId}`);
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      // Rejoindre les rooms après reconnexion
      this.pendingRooms.forEach((ticketId) => {
        this.socket?.emit('join:ticket', { ticketId });
        console.log(`[Socket] Rejoined room ticket:${ticketId} after reconnect`);
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    console.log(`[Socket] Listener added for '${event}' (connected: ${this.socket?.connected})`);

    // If already connected, register immediately
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
    // Otherwise, it will be registered when 'connect' event fires
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Join a ticket room for real-time updates
  joinTicketRoom(ticketId: string): void {
    // Ajouter à la liste des rooms en attente
    this.pendingRooms.add(ticketId);

    if (this.socket?.connected) {
      // Utiliser callback pour confirmation
      this.socket.emit('join:ticket', { ticketId }, (response: { success: boolean }) => {
        if (response?.success) {
          console.log(`[Socket] Confirmed joined room ticket:${ticketId}`);
        }
      });
      console.log(`[Socket] Joining room ticket:${ticketId}...`);
    } else {
      console.log(`[Socket] Room ticket:${ticketId} queued (waiting for connection)`);
      // Forcer la reconnexion si pas connecté
      this.connect();
    }
  }

  // Leave a ticket room
  leaveTicketRoom(ticketId: string): void {
    // Retirer de la liste des rooms en attente
    this.pendingRooms.delete(ticketId);

    if (this.socket?.connected) {
      this.socket.emit('leave:ticket', { ticketId });
      console.log(`[Socket] Left room ticket:${ticketId}`);
    }
  }

  // Subscribe to notifications
  subscribeToNotifications(): void {
    this.emit('subscribe:notifications');
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
