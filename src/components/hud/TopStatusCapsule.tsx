import React, { useEffect } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Cpu, Activity, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { StatusBadge } from '../ui/StatusBadge';
import { GlassPanel } from '../ui/GlassPanel';

export const TopStatusCapsule: React.FC = () => {
  const connectionStatus = useSubbuStore((state) => state.connectionStatus);
  const connectionDetail = useSubbuStore((state) => state.connectionDetail);
  const currentModelName = useSubbuStore((state) => state.currentModelName);
  const voiceState = useSubbuStore((state) => state.voiceState);
  const audioFrequencyData = useSubbuStore((state) => state.audioFrequencyData);
  const characterEnabled = useSubbuStore((state) => state.characterEnabled);
  const setCharacterEnabled = useSubbuStore((state) => state.setCharacterEnabled);
  const stageOnlyMode = useSubbuStore((state) => state.stageOnlyMode);
  const setStageOnlyMode = useSubbuStore((state) => state.setStageOnlyMode);
  const backendConfig = useSubbuStore((state) => state.backendConfig);
  const updateBackendConfig = useSubbuStore((state) => state.updateBackendConfig);
  const setActiveDrawer = useSubbuStore((state) => state.setActiveDrawer);
  const setStatusDashboardOpen = useSubbuStore((state) => state.setStatusDashboardOpen);
  const setModelSelectorOpen = useSubbuStore((state) => state.setModelSelectorOpen);

  // Timer Integration
  const isTimerRunning = useSubbuStore((state) => state.isTimerRunning);
  const timerSeconds = useSubbuStore((state) => state.timerSeconds);
  const timerMessage = useSubbuStore((state) => state.timerMessage);
  const tickTimer = useSubbuStore((state) => state.tickTimer);
  const stopTimer = useSubbuStore((state) => state.stopTimer);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  const isVoiceActive = voiceState === 'listening' || voiceState === 'speaking';
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
      <GlassPanel elevated className="px-4 py-1.5 flex items-center gap-3 rounded-full shadow-capsule">
        {/* 1. Gateway Connection Status */}
        <button
          onClick={() => setActiveDrawer('settings')}
          className="cursor-pointer hover:opacity-85 transition-opacity"
        >
          <StatusBadge status={connectionStatus} detail={connectionDetail} />
        </button>

        {/* 2. Model Badge */}
        <button
          onClick={() => setModelSelectorOpen(true)}
          title={`Click to switch LLM Model (Current: ${currentModelName})`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 hover:bg-white/90 text-xs font-mono text-ink-secondary border border-white/80 transition-all cursor-pointer shadow-2xs hover:border-sakura-300"
        >
          <Cpu className="w-3.5 h-3.5 text-sakura-600" />
          <span className="truncate max-w-[110px]">{currentModelName}</span>
        </button>

        {/* 3. System Status Test Dashboard Trigger */}
        <button
          onClick={() => setStatusDashboardOpen(true)}
          title="Open System Status Test Dashboard"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sakura-50/90 hover:bg-sakura-100/90 text-xs font-mono text-sakura-700 border border-sakura-200 transition-colors cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-sakura-600" />
          <span>Dashboard</span>
        </button>

        {/* 4. Live Audio Waveform (when voice active) */}
        {isVoiceActive ? (
          <div className="flex items-center gap-0.5 h-4 px-2 bg-sakura-100/70 rounded-full border border-sakura-200">
            {Array.from({ length: 14 }).map((_, i) => {
              const val = audioFrequencyData[i * 2] || 0;
              const barHeight = Math.max(3, (val / 255) * 16);
              return (
                <span
                  key={i}
                  className="w-0.5 bg-sakura-600 rounded-full transition-all duration-75"
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-ink-muted">
            <Activity className="w-3.5 h-3.5 text-sakura-400" />
            <span className="capitalize">{voiceState}</span>
          </div>
        )}

        <div className="h-4 w-[1px] bg-ink-faint/30" />

        {/* 5. Character 3D Toggle */}
        <button
          onClick={() => setCharacterEnabled(!characterEnabled)}
          title={characterEnabled ? 'Disable 3D Character (Switch to 2D Pearl Aura)' : 'Enable 3D Character'}
          className="p-1.5 rounded-full hover:bg-sakura-100 text-ink-secondary hover:text-sakura-700 transition-colors cursor-pointer"
        >
          {characterEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-ink-muted" />}
        </button>

        {/* 6. Stage-Only View Toggle */}
        <button
          onClick={() => setStageOnlyMode(!stageOnlyMode)}
          title={stageOnlyMode ? 'Exit Stage-Only Mode' : 'Enter Stage-Only Mode'}
          className="p-1.5 rounded-full hover:bg-sakura-100 text-ink-secondary hover:text-sakura-700 transition-colors cursor-pointer"
        >
          {stageOnlyMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </GlassPanel>

      {/* Active Timer Pill Banner */}
      {(isTimerRunning || timerMessage) && (
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-sakura-600 text-white text-xs font-mono shadow-md animate-fade-in">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span className="font-bold">
            {isTimerRunning ? formatTimer(timerSeconds) : timerMessage}
          </span>
          {isTimerRunning && (
            <button
              onClick={stopTimer}
              className="ml-2 text-[10px] uppercase font-bold underline hover:text-sakura-200 cursor-pointer"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Cloud Preview / Simulation Mode Warning Banner */}
      {connectionStatus !== 'Connected' && !backendConfig.simulationMode && (
        <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200/90 text-amber-800 text-[11px] px-3.5 py-1 rounded-full shadow-sm flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Local Gateway (127.0.0.1:18789) unreachable.</span>
          <button
            onClick={() => updateBackendConfig({ simulationMode: true })}
            className="font-semibold underline hover:text-amber-900 cursor-pointer ml-1"
          >
            Enable Preview Simulation
          </button>
        </div>
      )}

      {backendConfig.simulationMode && (
        <div className="bg-sakura-100/90 backdrop-blur-md border border-sakura-300 text-sakura-700 text-[11px] px-3 py-0.5 rounded-full shadow-2xs font-mono font-medium flex items-center gap-2">
          <span>● PREVIEW / SIMULATION MODE</span>
          <button
            onClick={() => updateBackendConfig({ simulationMode: false })}
            className="underline hover:text-sakura-800 cursor-pointer"
          >
            Switch to Real Mode
          </button>
        </div>
      )}
    </header>
  );
};

