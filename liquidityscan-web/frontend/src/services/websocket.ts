import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket;

  constructor() {
    // Determine the base URL for the WebSocket connection
    // Use the same origin as the frontend, Vite proxy will handle routing /socket.io to backend
    const url = window.location.origin;

    this.socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  /**
   * Subscribe to symbol updates for a specific timeframe
   */
  subscribeToSymbol(symbol: string, timeframe: string) {
    if (!symbol || !timeframe) return;
    this.socket.emit('subscribe:symbol', { symbol, timeframe });
  }

  /**
   * Unsubscribe from symbol updates
   */
  unsubscribeFromSymbol(symbol: string, timeframe: string) {
    if (!symbol || !timeframe) return;
    this.socket.emit('unsubscribe:symbol', { symbol, timeframe });
  }

  /**
   * Listen for custom events
   */
  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  /**
   * Remove listener for custom events
   */
  off(event: string, callback: (...args: any[]) => void) {
    this.socket.off(event, callback);
  }

  /**
   * Connect to WebSocket server manually
   */
  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }
}

// Export a singleton instance
export const wsService = new WebSocketService();
