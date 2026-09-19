import { VoteEvent } from '../types/poll';

export const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080').replace(/\/$/, '');

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class PollWebSocketClient {
  private ws: WebSocket | null = null;
  private pollId: string;
  private onMessageCallback: (event: VoteEvent) => void;
  private onStatusChangeCallback: (status: WSConnectionStatus) => void;
  private shouldReconnect = true;
  private reconnectTimeoutId: number | null = null;

  constructor(
    pollId: string,
    onMessage: (event: VoteEvent) => void,
    onStatusChange: (status: WSConnectionStatus) => void
  ) {
    this.pollId = pollId;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;
  }

  public connect(): void {
    this.shouldReconnect = true;
    this.onStatusChangeCallback('connecting');

    const url = this.pollId ? `${WS_BASE_URL}/ws/polls/${this.pollId}` : `${WS_BASE_URL}/ws/polls`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.onStatusChangeCallback('connected');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as VoteEvent;
          this.onMessageCallback(parsed);
        } catch {
          // Non-JSON message (e.g. heartbeat or raw log)
        }
      };

      this.ws.onclose = () => {
        this.onStatusChangeCallback('disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.onStatusChangeCallback('error');
      };
    } catch {
      this.onStatusChangeCallback('error');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) return;
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.shouldReconnect) {
        this.connect();
      }
    }, 3000);
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatusChangeCallback('disconnected');
  }
}
