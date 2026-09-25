import { WSMessagePayload } from '../types';
import { getStoredToken } from './api';

export type WSCallback = (data: WSMessagePayload) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private listeners: Set<WSCallback> = new Set();
  private reconnectTimer: any = null;
  private isIntentionallyClosed = false;

  public connect(roomId: string) {
    this.isIntentionallyClosed = false;
    this.currentRoomId = roomId;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.send({ type: 'user:joined', payload: { roomId } });
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = getStoredToken() || '';
    const wsUrl = `${protocol}//${host}/ws?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.send({ type: 'user:joined', payload: { roomId } });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WSMessagePayload = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(parsed));
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentRoomId && !this.isIntentionallyClosed) {
        this.connect(this.currentRoomId);
      }
    }, 2500);
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentRoomId = null;
  }

  public send(message: WSMessagePayload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public subscribe(callback: WSCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const realtimeClient = new RealtimeClient();
