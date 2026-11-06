/**
 * AgentDesktopEvents.ts
 * Event dispatcher for desktop automation actions, bridging to SUBBU UI and HUD.
 */

import { DesktopActionResult, DesktopActionType, UISnapshot } from './AgentDesktopTypes';

export type DesktopEventPayloadMap = {
  'action:start': { action: DesktopActionType; target?: string; timestamp: number };
  'action:success': DesktopActionResult;
  'action:error': { action: DesktopActionType; target?: string; error: string; timestamp: number };
  'snapshot:captured': UISnapshot;
  'approval:requested': { action: DesktopActionType; app: string; requestId: string };
  'approval:resolved': { requestId: string; approved: boolean };
};

export type DesktopEventListener<K extends keyof DesktopEventPayloadMap> = (
  payload: DesktopEventPayloadMap[K]
) => void;

export class AgentDesktopEvents {
  private static instance: AgentDesktopEvents;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {}

  public static getInstance(): AgentDesktopEvents {
    if (!AgentDesktopEvents.instance) {
      AgentDesktopEvents.instance = new AgentDesktopEvents();
    }
    return AgentDesktopEvents.instance;
  }

  public on<K extends keyof DesktopEventPayloadMap>(
    event: K,
    listener: DesktopEventListener<K>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  public emit<K extends keyof DesktopEventPayloadMap>(
    event: K,
    payload: DesktopEventPayloadMap[K]
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[AgentDesktopEvents] Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  public removeAllListeners(): void {
    this.listeners.clear();
  }
}

