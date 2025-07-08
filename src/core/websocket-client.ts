import { CommandParser } from './command-parser';
import { BabylonScene } from './babylon-scene';

export interface WebSocketClientOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private onConnectionChange?: (connected: boolean) => void;
  private onMessage?: (message: string) => void;
  private commandParser: CommandParser;

  constructor(
    scene: BabylonScene,
    options: WebSocketClientOptions = {}
  ) {
    this.url = options.url || 'ws://localhost:8080';
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.commandParser = new CommandParser(scene);
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.log(`Connecting to WebSocket server at ${this.url}...`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.log('Connected to WebSocket server');
        this.onConnectionChange?.(true);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.log('WebSocket connection closed');
        this.onConnectionChange?.(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        this.log(`WebSocket error: ${error}`);
        this.onConnectionChange?.(false);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      this.isConnecting = false;
      this.log(`Failed to create WebSocket: ${error}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    this.log(`Reconnecting in ${this.reconnectInterval / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'command') {
        this.log(`Received command: ${message.command}`);
        const result = this.commandParser.parseAndExecute(message.command);
        
        // Send response back to server
        this.send({
          type: 'response',
          id: message.id,
          success: result.success,
          message: result.message
        });
        
        this.log(result.message);
      }
    } catch (error) {
      this.log(`Error handling message: ${error}`);
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.log('Cannot send message: WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onConnectionStateChange(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  onLog(callback: (message: string) => void): void {
    this.onMessage = callback;
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.onMessage?.(`[${timestamp}] WebSocket: ${message}`);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}