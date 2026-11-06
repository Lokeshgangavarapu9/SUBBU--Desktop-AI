import {
  OpenClawConnectionStatus,
  OpenClawFrame,
  OpenClawReqFrame,
  OpenClawResFrame,
  OpenClawEventFrame,
  ConnectChallengePayload,
  ConnectParams,
  HelloOkPayload,
} from '../../types/openclaw';
import { createRequestFrame, parseIncomingFrame } from './protocol';

type EventCallback = (event: string, payload: any) => void;
type StatusCallback = (status: OpenClawConnectionStatus, detail?: string) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

export class OpenClawSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private authToken: string;
  private status: OpenClawConnectionStatus = 'Disconnected';
  private pendingRequests = new Map<string, PendingRequest>();
  private eventListeners = new Set<EventCallback>();
  private statusListeners = new Set<StatusCallback>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionalClose = false;
  private tickTimer: NodeJS.Timeout | null = null;
  private capabilities: HelloOkPayload | null = null;

  constructor(url = 'ws://127.0.0.1:18789', authToken = '') {
    this.url = url;
    this.authToken = authToken;
  }

  public setUrl(url: string) {
    this.url = url;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  public getStatus(): OpenClawConnectionStatus {
    return this.status;
  }

  public getCapabilities(): HelloOkPayload | null {
    return this.capabilities;
  }

  public onEvent(cb: EventCallback): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  public onStatusChange(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(newStatus: OpenClawConnectionStatus, detail?: string) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => cb(newStatus, detail));
    }
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionalClose = false;
    this.setStatus('Connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        // Wait for connect.challenge event from Gateway Protocol v4
        this.resetTickTimer();
      };

      this.ws.onmessage = (ev) => {
        this.handleMessage(ev.data);
      };

      this.ws.onclose = (ev) => {
        this.cleanup();
        const reason = (ev.reason || '').toLowerCase();
        if (ev.code === 4001 || ev.code === 1008 || reason.includes('auth') || reason.includes('identity')) {
          this.setStatus('Authentication Required', ev.reason || 'OpenClaw gateway token required');
        } else if (!this.isIntentionalClose) {
          this.setStatus('Disconnected');
          this.scheduleReconnect();
        } else {
          this.setStatus('Disconnected');
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[OpenClawSocket] Socket error:', err);
        // Error will trigger onclose
      };
    } catch (err) {
      console.error('[OpenClawSocket] Connection creation error:', err);
      this.setStatus('Backend Error', String(err));
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.cleanup();
    this.setStatus('Disconnected');
  }

  private cleanup(): void {
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    // Reject pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error(`WebSocket connection closed before response for request ${id}`));
    }
    this.pendingRequests.clear();
  }

  private scheduleReconnect(): void {
    if (this.isIntentionalClose) return;

    // Use bounded exponential backoff capping at 6s for smooth auto-reconnect
    const backoffMs = Math.min(1000 * Math.pow(1.3, Math.min(this.reconnectAttempts, 8)) + Math.random() * 300, 6000);
    this.reconnectAttempts += 1;
    this.setStatus('Connecting', `Connecting to gateway (${(backoffMs / 1000).toFixed(1)}s)...`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, backoffMs);
  }

  private resetTickTimer(): void {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    // If no tick or message received within 35s, assume connection stale
    this.tickTimer = setTimeout(() => {
      console.warn('[OpenClawSocket] Tick timeout. Reconnecting...');
      if (this.ws) {
        this.ws.close(1002, 'Heartbeat timeout');
      }
    }, 35000);
  }

  private handleMessage(raw: string): void {
    this.resetTickTimer();
    const frame = parseIncomingFrame(raw);
    if (!frame) return;

    if (frame.type === 'event') {
      this.handleEvent(frame as OpenClawEventFrame);
    } else if (frame.type === 'res') {
      this.handleResponse(frame as OpenClawResFrame);
    }
  }

  private handleEvent(frame: OpenClawEventFrame): void {
    // 1. Handshake Challenge
    if (frame.event === 'connect.challenge') {
      this.performHandshake(frame.payload as ConnectChallengePayload);
      return;
    }

    // 2. Gateway Tick Keepalive
    if (frame.event === 'tick') {
      return;
    }

    // Dispatch to registered event listeners
    this.eventListeners.forEach((cb) => {
      try {
        cb(frame.event, frame.payload);
      } catch (err) {
        console.error('[OpenClawSocket] Error in event listener:', err);
      }
    });
  }

  private performHandshake(challenge: ConnectChallengePayload): void {
    const params: ConnectParams = {
      minProtocol: 4,
      maxProtocol: 4,
      role: 'operator',
      scopes: [
        'operator.read',
        'operator.write',
        'operator.approvals',
        'operator.talk.secrets',
      ],
      caps: [
        'tool-events',
        'inline-widgets',
        'chat-only-assistant-text',
        'presence-deltas',
        'session-row-deltas',
      ],
      auth: this.authToken ? { token: this.authToken } : undefined,
      client: {
        id: 'gateway-client',
        version: '1.0.0',
        platform: 'windows',
        mode: 'backend',
      },
    };

    const req = createRequestFrame('connect', params);

    this.sendRaw(req);

    // Set a one-off handler for handshake response
    this.pendingRequests.set(req.id, {
      resolve: (resPayload: HelloOkPayload) => {
        this.reconnectAttempts = 0;
        this.capabilities = resPayload;
        this.setStatus('Connected');
      },
      reject: (err: any) => {
        if (err?.retryable || err?.code === 'UNAVAILABLE') {
          const delayMs = err?.retryAfterMs || 1000;
          setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.performHandshake(challenge);
            }
          }, delayMs);
          return;
        }
        console.error('[OpenClawSocket] Handshake failed:', JSON.stringify(err));
        const errMsg = String(err?.message || err?.code || '').toLowerCase();
        if (errMsg.includes('auth') || errMsg.includes('identity') || errMsg.includes('not_paired')) {
          this.setStatus('Authentication Required', err?.message || 'OpenClaw gateway token required');
        } else {
          this.setStatus('Backend Error', err?.message);
        }
      },
      timer: setTimeout(() => {
        this.pendingRequests.delete(req.id);
        this.setStatus('Backend Error', 'Handshake response timeout');
      }, 10000),
    });
  }

  private handleResponse(res: OpenClawResFrame): void {
    console.log('[OpenClawSocket] handleResponse id:', res.id, 'ok:', res.ok, 'error:', JSON.stringify(res.error));
    const pending = this.pendingRequests.get(res.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(res.id);

    if (res.ok) {
      pending.resolve(res.payload ?? res.result);
    } else {
      pending.reject(res.error || new Error('RPC request returned false'));
    }
  }

  private sendRaw(frame: OpenClawFrame): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(frame));
    return true;
  }

  public request<TResult = unknown, TParams = unknown>(
    method: string,
    params?: TParams,
    timeoutMs = 30000
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      if (this.status !== 'Connected' && method !== 'connect') {
        reject(new Error(`Cannot send RPC ${method}: Socket is ${this.status}`));
        return;
      }

      const req = createRequestFrame(method, params);

      const timer = setTimeout(() => {
        this.pendingRequests.delete(req.id);
        reject(new Error(`RPC timeout (${timeoutMs}ms) for method ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(req.id, {
        resolve,
        reject,
        timer,
      });

      const sent = this.sendRaw(req);
      if (!sent) {
        clearTimeout(timer);
        this.pendingRequests.delete(req.id);
        reject(new Error(`Failed to transmit frame for method ${method}`));
      }
    });
  }
}

