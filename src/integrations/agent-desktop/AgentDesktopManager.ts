/**
 * AgentDesktopManager.ts
 * Main entrypoint and lifecycle manager for the desktop automation integration in SUBBU.
 */

import { AgentDesktopClient, CommandExecutor } from './AgentDesktopClient';
import { AgentDesktopAdapter } from './AgentDesktopAdapter';
import { AgentDesktopHealth } from './AgentDesktopHealth';
import { AgentDesktopEvents } from './AgentDesktopEvents';
import { HealthCheckResult } from './AgentDesktopTypes';

export class AgentDesktopManager {
  private static instance: AgentDesktopManager;
  public readonly client: AgentDesktopClient;
  public readonly adapter: AgentDesktopAdapter;
  public readonly events: AgentDesktopEvents;
  private isInitialized = false;

  private constructor(executor?: CommandExecutor) {
    this.client = new AgentDesktopClient(executor);
    this.adapter = new AgentDesktopAdapter(this.client);
    this.events = AgentDesktopEvents.getInstance();
  }

  public static getInstance(executor?: CommandExecutor): AgentDesktopManager {
    if (!AgentDesktopManager.instance) {
      AgentDesktopManager.instance = new AgentDesktopManager(executor);
    } else if (executor) {
      AgentDesktopManager.instance.client.setExecutor(executor);
    }
    return AgentDesktopManager.instance;
  }

  public async initialize(): Promise<{ initialized: boolean; health: HealthCheckResult }> {
    const health = await this.checkHealth();
    this.isInitialized = health.healthy;
    return { initialized: this.isInitialized, health };
  }

  public async checkHealth(): Promise<HealthCheckResult> {
    return AgentDesktopHealth.checkHealth(async (args) => {
      const res = await (this.client as any).executeAction('status', args);
      return { ok: res.success, data: res.data, error: res.error, raw: typeof res.data === 'string' ? res.data : undefined };
    });
  }

  public get ready(): boolean {
    return this.isInitialized;
  }
}

