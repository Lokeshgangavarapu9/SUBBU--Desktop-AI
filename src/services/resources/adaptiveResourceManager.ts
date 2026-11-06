/**
 * src/services/resources/adaptiveResourceManager.ts
 * Real-time Adaptive Hardware Resource Manager for HP Victus / Windows 11.
 * Hardware profile: Intel i5-13420H, 16GB RAM, RTX 3050 4GB VRAM.
 */

import { useSubbuStore } from '../../store/useSubbuStore';
import { RenderQualityPreset } from '../../types/character';

export interface HardwareTelemetry {
  cpuUsagePct: number;
  freeRamGB: number;
  totalRamGB: number;
  vramUsedMB: number;
  vramTotalMB: number;
  gpuUtilizationPct: number;
  mode: RenderQualityPreset;
  pressureLevel: 'nominal' | 'moderate' | 'critical';
}

class AdaptiveResourceManager {
  private static instance: AdaptiveResourceManager;
  private intervalTimer: NodeJS.Timeout | null = null;
  private currentTelemetry: HardwareTelemetry = {
    cpuUsagePct: 5,
    freeRamGB: 2.0,
    totalRamGB: 16.0,
    vramUsedMB: 2100,
    vramTotalMB: 4094,
    gpuUtilizationPct: 10,
    mode: 'balanced',
    pressureLevel: 'nominal',
  };

  private constructor() {}

  public static getInstance(): AdaptiveResourceManager {
    if (!AdaptiveResourceManager.instance) {
      AdaptiveResourceManager.instance = new AdaptiveResourceManager();
    }
    return AdaptiveResourceManager.instance;
  }

  public startMonitoring(pollIntervalMs = 5000): void {
    if (this.intervalTimer) return;

    this.checkResources();
    this.intervalTimer = setInterval(() => {
      this.checkResources();
    }, pollIntervalMs);
  }

  public stopMonitoring(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public getTelemetry(): HardwareTelemetry {
    return { ...this.currentTelemetry };
  }

  public setQualityMode(mode: RenderQualityPreset): void {
    useSubbuStore.getState().setQualityPreset(mode);
    if (mode === 'eco') {
      useSubbuStore.getState().setReducedAnimation(true);
      useSubbuStore.getState().setAutoPauseOnMinimize(true);
    } else if (mode === 'balanced') {
      useSubbuStore.getState().setReducedAnimation(false);
      useSubbuStore.getState().setAutoPauseOnMinimize(true);
    } else {
      useSubbuStore.getState().setReducedAnimation(false);
    }
    this.currentTelemetry.mode = mode;
  }

  private async checkResources(): Promise<void> {
    const store = useSubbuStore.getState();
    const adapter = store.adapter;

    try {
      // 1. Check Ollama GPU VRAM status
      const vramInfo = await adapter.getOllamaVramUsage().catch(() => ({ loaded: [], totalVramBytes: 0 }));
      const vramMB = Math.round(vramInfo.totalVramBytes / (1024 * 1024)) || 2200;
      this.currentTelemetry.vramUsedMB = vramMB;

      // 2. Browser Memory API (if available in Chromium / WebView2)
      const perf: any = window.performance;
      if (perf && perf.memory) {
        const usedHeapMB = perf.memory.usedJSHeapSize / (1024 * 1024);
        const totalHeapMB = perf.memory.totalJSHeapSize / (1024 * 1024);
        if (usedHeapMB > 450) {
          // JS heap pressure
          this.currentTelemetry.pressureLevel = 'moderate';
        }
      }

      // 3. Evaluate 4GB VRAM Hardware Pressure:
      // RTX 3050 has 4094 MB VRAM. If VRAM > 3300 MB, drop to eco mode automatically
      if (vramMB > 3300) {
        this.currentTelemetry.pressureLevel = 'critical';
        if (store.qualityPreset !== 'eco') {
          console.warn('[AdaptiveManager] High VRAM pressure detected (>3.3GB / 4GB). Auto-switching to Low Resource Mode.');
          this.setQualityMode('eco');
        }
      } else if (vramMB > 2700) {
        this.currentTelemetry.pressureLevel = 'moderate';
        if (store.qualityPreset === 'high') {
          console.log('[AdaptiveManager] Moderate VRAM pressure. Adjusting to Balanced mode.');
          this.setQualityMode('balanced');
        }
      } else {
        this.currentTelemetry.pressureLevel = 'nominal';
      }
    } catch (_) {}
  }
}

export const adaptiveResourceManager = AdaptiveResourceManager.getInstance();

