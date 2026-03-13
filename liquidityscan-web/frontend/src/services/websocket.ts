import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket) return;

    // We'll use the same URL resolution logic as API calls, or let socket.io figure it out
    const apiUrl = import.meta.env.VITE_API_URL || '';

    // Create socket connection
    this.socket = io(apiUrl || undefined, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    // Generic event handler to dispatch to our listeners
    this.socket.onAny((event, ...args) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach(callback => callback(...args));
      }
    });
  }

  public subscribeToSymbol(symbol: string, timeframe: string) {
    if (!this.socket) this.connect();

    this.socket?.emit('subscribe:symbol', { symbol, timeframe });
    console.log(`[WebSocket] Subscribed to ${symbol} ${timeframe}`);
  }

  public unsubscribeFromSymbol(symbol: string, timeframe: string) {
    this.socket?.emit('unsubscribe:symbol', { symbol, timeframe });
    console.log(`[WebSocket] Unsubscribed from ${symbol} ${timeframe}`);
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
