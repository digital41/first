import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    const token = getAccessToken();
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected - registering listeners');
      // Re-register all listeners AFTER connection is established
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });
      console.log(`[Socket] Registered ${this.listeners.size} event types`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
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
    this.emit('join:ticket', { ticketId });
  }

  // Leave a ticket room
  leaveTicketRoom(ticketId: string): void {
    this.emit('leave:ticket', { ticketId });
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
