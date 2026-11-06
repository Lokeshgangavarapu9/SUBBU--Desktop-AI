/**
 * AgentDesktopHealth.ts
 * Health verification, environment diagnostics, and station probe.
 */

import { HealthCheckResult } from './AgentDesktopTypes';

export class AgentDesktopHealth {
  private static cachedHealth: HealthCheckResult | null = null;
  private static lastCheckTime = 0;
  private static CACHE_TTL_MS = 10000; // 10 seconds

  /**
   * Run comprehensive health diagnostic.
   */
  public static async checkHealth(
    execFunction: (args: string[]) => Promise<{ ok: boolean; data?: any; error?: string; raw?: string }>
  ): Promise<HealthCheckResult> {
    const now = Date.now();
    if (this.cachedHealth && now - this.lastCheckTime < this.CACHE_TTL_MS) {
      return this.cachedHealth;
    }

    let version = 'unknown';
    let canEnumerate = false;
    let uiaAvailable = false;
    let interactive = true;

    // 1. Probe version
    const versionRes = await execFunction(['--version']);
    if (versionRes.ok && versionRes.raw) {
      version = versionRes.raw.trim();
    }

    // 2. Probe list-apps
    const appsRes = await execFunction(['list-apps']);
    if (appsRes.ok) {
      canEnumerate = true;
      uiaAvailable = true;
    } else {
      if (appsRes.error && appsRes.error.includes('EnumWindows failed')) {
        interactive = false;
      }
    }

    const result: HealthCheckResult = {
      healthy: canEnumerate,
      version,
      binary_path: 'agent-desktop-launcher.exe -> agent-desktop-win32-x64.exe',
      launcher_active: true,
      interactive_station: interactive,
      diagnostics: {
        can_enumerate_apps: canEnumerate,
        uia_available: uiaAvailable,
      },
      checked_at: new Date().toISOString(),
    };

    this.cachedHealth = result;
    this.lastCheckTime = now;
    return result;
  }

  public static clearCache(): void {
    this.cachedHealth = null;
    this.lastCheckTime = 0;
  }
}

