import { io, Socket } from 'socket.io-client';
import { TokenStorage } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class AdminSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private pendingRooms: Set<string> = new Set();

  connect(): void {
    const token = TokenStorage.getAccessToken();
    if (!token) {
      console.log('[AdminSocket] No token, cannot connect');
      return;
    }

    if (this.socket?.connected) {
      console.log('[AdminSocket] Already connected');
      return;
    }

    if (this.socket) {
      console.log('[AdminSocket] Socket exists but disconnected, cleaning up');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('[AdminSocket] Creating new connection to', SOCKET_URL);
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[AdminSocket] Connected successfully! Socket ID:', this.socket?.id);

      // Re-register all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });
      console.log(`[AdminSocket] Registered ${this.listeners.size} event types`);

      // Join pending rooms
      if (this.pendingRooms.size > 0) {
        console.log(`[AdminSocket] Joining ${this.pendingRooms.size} pending rooms`);
        this.pendingRooms.forEach((ticketId) => {
          this.socket?.emit('join:ticket', { ticketId });
        });
      }

      // Subscribe to admin notifications
      this.subscribeToAdminNotifications();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[AdminSocket] Disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[AdminSocket] Reconnected after', attemptNumber, 'attempts');
      this.pendingRooms.forEach((ticketId) => {
        this.socket?.emit('join:ticket', { ticketId });
      });
      this.subscribeToAdminNotifications();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[AdminSocket] Connection error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.pendingRooms.clear();
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    console.log(`[AdminSocket] Listener added for '${event}'`);

    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
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

  joinTicketRoom(ticketId: string): void {
    this.pendingRooms.add(ticketId);
    if (this.socket?.connected) {
      this.socket.emit('join:ticket', { ticketId });
      console.log(`[AdminSocket] Joined room ticket:${ticketId}`);
    }
  }

  leaveTicketRoom(ticketId: string): void {
    this.pendingRooms.delete(ticketId);
    if (this.socket?.connected) {
      this.socket.emit('leave:ticket', { ticketId });
      console.log(`[AdminSocket] Left room ticket:${ticketId}`);
    }
  }

  subscribeToAdminNotifications(): void {
    this.emit('subscribe:notifications');
    console.log('[AdminSocket] Subscribed to admin notifications');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const adminSocketService = new AdminSocketService();
export default adminSocketService;
