import React, { useEffect, useState } from 'react';
import {
  Wifi,
  Cpu,
  User,
  Sparkles,
  Sliders,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const SettingsModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conn' | 'models' | 'char' | 'perf' | 'diag'>('conn');

  const backendConfig = useSubbuStore((state) => state.backendConfig);
  const updateBackendConfig = useSubbuStore((state) => state.updateBackendConfig);
  const connectionStatus = useSubbuStore((state) => state.connectionStatus);
  const adapter = useSubbuStore((state) => state.adapter);

  // Stage & Performance settings
  const qualityPreset = useSubbuStore((state) => state.qualityPreset);
  const setQualityPreset = useSubbuStore((state) => state.setQualityPreset);
  const reducedAnimation = useSubbuStore((state) => state.reducedAnimation);
  const setReducedAnimation = useSubbuStore((state) => state.setReducedAnimation);
  const reducedGpu = useSubbuStore((state) => state.reducedGpu);
  const setReducedGpu = useSubbuStore((state) => state.setReducedGpu);
  const autoPause = useSubbuStore((state) => state.autoPauseOnMinimize);
  const setAutoPause = useSubbuStore((state) => state.setAutoPauseOnMinimize);

  // Telemetry
  const installedModels = useSubbuStore((state) => state.installedModels);
  const setInstalledModels = useSubbuStore((state) => state.setInstalledModels);
  const vramBytes = useSubbuStore((state) => state.vramUsageBytes);
  const setVramBytes = useSubbuStore((state) => state.setVramUsageBytes);
  const currentModelName = useSubbuStore((state) => state.currentModelName);
  const setCurrentModelName = useSubbuStore((state) => state.setCurrentModelName);

  // Local form inputs
  const [wsUrl, setWsUrl] = useState(backendConfig.openclawWsUrl);
  const [httpUrl, setHttpUrl] = useState(backendConfig.openclawHttpUrl);
  const [ollamaUrl, setOllamaUrl] = useState(backendConfig.ollamaUrl);
  const [token, setToken] = useState(backendConfig.authToken);
  const [testResult, setTestResult] = useState<{ msg: string; isError?: boolean } | null>(null);

  // URL Validation Helpers
  const isValidWsUrl = (u: string) => /^wss?:\/\/[^\s/$.?#].[^\s]*$/i.test(u) || /^wss?:\/\/localhost(:\d+)?/i.test(u) || /^wss?:\/\/127\.0\.0\.1(:\d+)?/i.test(u);
  const isValidHttpUrl = (u: string) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(u) || /^https?:\/\/localhost(:\d+)?/i.test(u) || /^https?:\/\/127\.0\.0\.1(:\d+)?/i.test(u);

  // Fetch telemetry on tab change
  useEffect(() => {
    if (activeTab === 'models') {
      adapter.getOllamaModels().then((models) => setInstalledModels(models));
      adapter.getOllamaVramUsage().then((res) => setVramBytes(res.totalVramBytes));
    }
  }, [activeTab, adapter]);

  const handleSaveConnection = () => {
    if (!isValidWsUrl(wsUrl)) {
      setTestResult({ msg: 'Invalid WebSocket Gateway URL. Must start with ws:// or wss://', isError: true });
      return;
    }
    if (!isValidHttpUrl(httpUrl)) {
      setTestResult({ msg: 'Invalid OpenClaw HTTP URL. Must start with http:// or https://', isError: true });
      return;
    }
    if (!isValidHttpUrl(ollamaUrl)) {
      setTestResult({ msg: 'Invalid Ollama URL. Must start with http:// or https://', isError: true });
      return;
    }

    updateBackendConfig({
      openclawWsUrl: wsUrl,
      openclawHttpUrl: httpUrl,
      ollamaUrl,
      authToken: token,
    });
    adapter.disconnect();
    adapter.connect();
    setTestResult({ msg: 'Configuration updated. Reconnecting to services...' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestOllama = async () => {
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const count = data.models?.length || 0;
        setTestResult({ msg: `Ollama Connected! Found ${count} installed model(s).` });
      } else {
        setTestResult({ msg: `Ollama returned HTTP ${res.status}`, isError: true });
      }
    } catch (e: any) {
      setTestResult({ msg: `Ollama test failed: ${e.message}`, isError: true });
    }
  };

  const handleTestOpenClaw = async () => {
    try {
      const res = await fetch(`${httpUrl}/health`, { method: 'GET' }).catch(() => null);
      if (res && res.ok) {
        setTestResult({ msg: 'OpenClaw Gateway HTTP endpoint is online and healthy!' });
      } else {
        // Fallback test via WebSocket
        const ws = new WebSocket(wsUrl);
        const wsPromise = new Promise<boolean>((resolve) => {
          ws.onopen = () => {
            ws.close();
            resolve(true);
          };
          ws.onerror = () => resolve(false);
          setTimeout(() => {
            ws.close();
            resolve(false);
          }, 2000);
        });
        const ok = await wsPromise;
        if (ok) {
          setTestResult({ msg: 'OpenClaw WebSocket handshake succeeded!' });
        } else {
          setTestResult({ msg: 'OpenClaw connection check timed out or was rejected.', isError: true });
        }
      }
    } catch (e: any) {
      setTestResult({ msg: `OpenClaw test failed: ${e.message}`, isError: true });
    }
  };

  const vramTotalMb = 4096;
  const vramUsedMb = Math.round(vramBytes / (1024 * 1024));
  const vramPercent = Math.min(100, Math.round((vramUsedMb / vramTotalMb) * 100));

  return (
    <div className="flex flex-col gap-3">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 pb-2 border-b border-sakura-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab('conn')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'conn' ? 'bg-sakura-300 text-sakura-700 font-semibold' : 'text-ink-secondary hover:bg-white/60'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Connection</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'models' ? 'bg-sakura-300 text-sakura-700 font-semibold' : 'text-ink-secondary hover:bg-white/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Models</span>
        </button>

        <button
          onClick={() => setActiveTab('char')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'char' ? 'bg-sakura-300 text-sakura-700 font-semibold' : 'text-ink-secondary hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stage & Aura</span>
        </button>

        <button
          onClick={() => setActiveTab('perf')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'perf' ? 'bg-sakura-300 text-sakura-700 font-semibold' : 'text-ink-secondary hover:bg-white/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('diag')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'diag' ? 'bg-sakura-300 text-sakura-700 font-semibold' : 'text-ink-secondary hover:bg-white/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Diagnostics</span>
        </button>
      </div>

      {testResult && (
        <div
          className={`p-2.5 border text-xs rounded-xl flex items-center justify-between gap-2 ${
            testResult.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{testResult.msg}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="cursor-pointer text-ink-muted">
            &times;
          </button>
        </div>
      )}

      {/* Tab 1: Connection & Auth */}
      {activeTab === 'conn' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              OpenClaw WebSocket Gateway URL
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white/70 border border-white/90 rounded-xl text-xs font-mono text-ink-primary outline-hidden focus:border-sakura-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              OpenClaw HTTP Base URL
            </label>
            <input
              type="text"
              value={httpUrl}
              onChange={(e) => setHttpUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white/70 border border-white/90 rounded-xl text-xs font-mono text-ink-primary outline-hidden focus:border-sakura-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              Ollama Service URL
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white/70 border border-white/90 rounded-xl text-xs font-mono text-ink-primary outline-hidden focus:border-sakura-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              Gateway Auth Token (Optional / Session Scoped)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Leave blank for loopback challenge or enter token"
              className="w-full px-3 py-2 bg-white/70 border border-white/90 rounded-xl text-xs font-mono text-ink-primary outline-hidden focus:border-sakura-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <GlassButton variant="primary" size="sm" onClick={handleSaveConnection} className="w-full sm:flex-1">
              Apply & Connect
            </GlassButton>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <GlassButton variant="secondary" size="sm" onClick={handleTestOpenClaw}>
                Test Gateway
              </GlassButton>
              <GlassButton variant="secondary" size="sm" onClick={handleTestOllama}>
                Test Ollama
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Models & VRAM Telemetry */}
      {activeTab === 'models' && (
        <div className="flex flex-col gap-3">
          {/* 4GB VRAM Budget Gauge */}
          <div className="p-3 bg-white/75 border border-white/90 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-ink-primary">NVIDIA RTX 3050 VRAM Budget</span>
              <span className="font-mono text-sakura-600">
                {vramUsedMb} MB / {vramTotalMb} MB ({vramPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-sakura-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  vramPercent > 85 ? 'bg-rose-500' : 'bg-sakura-500'
                }`}
                style={{ width: `${Math.max(4, vramPercent)}%` }}
              />
            </div>
            <span className="text-[10px] text-ink-muted">
              {vramPercent > 80
                ? 'High VRAM usage. Eco mode is recommended.'
                : 'VRAM usage is within optimal operating limits.'}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              Installed Ollama Models ({installedModels.length})
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {installedModels.length === 0 ? (
                <div className="p-3 text-center text-xs text-ink-muted bg-white/50 rounded-xl">
                  No models returned by Ollama (is Ollama running on 11434?)
                </div>
              ) : (
                installedModels.map((m) => (
                  <div
                    key={m.name}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer ${
                      currentModelName === m.name
                        ? 'bg-sakura-100 border-sakura-300 text-sakura-700'
                        : 'bg-white/70 border-white/90 text-ink-primary hover:bg-white/90'
                    }`}
                    onClick={() => setCurrentModelName(m.name)}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-semibold">{m.name}</span>
                      <span className="text-[10px] text-ink-muted">
                        Size: {(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </span>
                    </div>
                    {currentModelName === m.name && (
                      <span className="text-[10px] uppercase font-bold text-sakura-600">Active</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Ambient Stage & Aura Settings */}
      {activeTab === 'char' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 bg-white/70 rounded-2xl border border-white/90">
            <span className="text-xs font-semibold text-ink-primary block mb-1">Ambient Companion Stage</span>
            <span className="text-[10px] text-ink-muted leading-relaxed block">
              SUBBU operates with a clean, character-free ambient aura interface. The central presence sphere dynamically responds to your voice, model thinking pulses, and system events without 3D model overhead.
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 rounded-2xl border border-white/90">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink-primary">Reduced GPU Particles</span>
              <span className="text-[10px] text-ink-muted">
                Disable floating ambient particles for minimal power consumption
              </span>
            </div>
            <input
              type="checkbox"
              checked={reducedGpu}
              onChange={(e) => setReducedGpu(e.target.checked)}
              className="w-4 h-4 accent-sakura-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 rounded-2xl border border-white/90">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink-primary">Reduced Animation</span>
              <span className="text-[10px] text-ink-muted">
                Simplify transition motions across cards and overlays
              </span>
            </div>
            <input
              type="checkbox"
              checked={reducedAnimation}
              onChange={(e) => setReducedAnimation(e.target.checked)}
              className="w-4 h-4 accent-sakura-500 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Performance & Hardware Presets */}
      {activeTab === 'perf' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-ink-primary mb-1 block">
              RTX 3050 Hardware Quality Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setQualityPreset('balanced');
                  setReducedGpu(false);
                }}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  qualityPreset === 'balanced'
                    ? 'bg-sakura-100 border-sakura-300 shadow-sm'
                    : 'bg-white/70 border-white/90'
                }`}
              >
                <span className="text-xs font-bold block text-ink-primary">Balanced (Default)</span>
                <span className="text-[10px] text-ink-muted">1.25x DPR, 60 FPS, Soft Glass Blur</span>
              </button>

              <button
                onClick={() => {
                  setQualityPreset('eco');
                  setReducedGpu(true);
                }}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  qualityPreset === 'eco'
                    ? 'bg-sakura-100 border-sakura-300 shadow-sm'
                    : 'bg-white/70 border-white/90'
                }`}
              >
                <span className="text-xs font-bold block text-ink-primary">Eco / Low VRAM</span>
                <span className="text-[10px] text-ink-muted">1.0x DPR, Opaque Pearl, 0% Extra Blur</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 rounded-2xl border border-white/90">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink-primary">Auto-Pause on Minimize</span>
              <span className="text-[10px] text-ink-muted">
                Pauses 3D WebGL rendering when window is hidden
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoPause}
              onChange={(e) => setAutoPause(e.target.checked)}
              className="w-4 h-4 accent-sakura-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-white/70 rounded-2xl border border-white/90">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink-primary">Reduced Animation</span>
              <span className="text-[10px] text-ink-muted">
                Replaces spring physics with instant transitions
              </span>
            </div>
            <input
              type="checkbox"
              checked={reducedAnimation}
              onChange={(e) => setReducedAnimation(e.target.checked)}
              className="w-4 h-4 accent-sakura-500 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Tab 5: Developer Diagnostics */}
      {activeTab === 'diag' && (
        <div className="flex flex-col gap-2 font-mono text-[11px]">
          <span className="font-semibold text-ink-primary">Gateway Connection Diagnostics:</span>
          <div className="p-3 bg-sakura-50 rounded-2xl border border-sakura-200 text-ink-primary space-y-1">
            <div>Status: <span className="font-bold text-sakura-700">{connectionStatus}</span></div>
            <div>WS URL: {backendConfig.openclawWsUrl}</div>
            <div>Ollama URL: {backendConfig.ollamaUrl}</div>
            <div>Simulation Mode: {backendConfig.simulationMode ? 'ACTIVE' : 'OFF'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

