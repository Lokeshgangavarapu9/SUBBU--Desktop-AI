import React, { useEffect } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useSubbuStore } from '../store/useSubbuStore';
import { SubbuStageCanvas } from '../components/stage/SubbuStageCanvas';
import { ThoughtBubble } from '../components/stage/ThoughtBubble';
import { LiveCaptionCard } from '../components/stage/LiveCaptionCard';
import { TopStatusCapsule } from '../components/hud/TopStatusCapsule';
import { LeftNavDock } from '../components/hud/LeftNavDock';
import { FloatingComposer } from '../components/hud/FloatingComposer';
import { RightContextDrawer } from '../components/drawers/RightContextDrawer';
import { lazy, Suspense } from 'react';

const ApprovalModal = lazy(() => import('../components/modals/ApprovalModal').then((m) => ({ default: m.ApprovalModal })));
const SystemStatusModal = lazy(() => import('../components/modals/SystemStatusModal').then((m) => ({ default: m.SystemStatusModal })));
const QuickCommandOverlay = lazy(() => import('../components/modals/QuickCommandOverlay').then((m) => ({ default: m.QuickCommandOverlay })));
const ModelSelectorModal = lazy(() => import('../components/modals/ModelSelectorModal').then((m) => ({ default: m.ModelSelectorModal })));

export const App: React.FC = () => {
  const adapter = useSubbuStore((state) => state.adapter);
  const setConnectionStatus = useSubbuStore((state) => state.setConnectionStatus);
  const setVoiceState = useSubbuStore((state) => state.setVoiceState);
  const setAudioTelemetry = useSubbuStore((state) => state.setAudioTelemetry);
  const addApprovalRequest = useSubbuStore((state) => state.addApprovalRequest);
  const setExpression = useSubbuStore((state) => state.setExpression);
  const setGesture = useSubbuStore((state) => state.setGesture);
  const setSessions = useSubbuStore((state) => state.setSessions);
  const setInstalledModels = useSubbuStore((state) => state.setInstalledModels);
  const setCurrentModelName = useSubbuStore((state) => state.setCurrentModelName);

  // Global Backend & Voice Initialization
  useEffect(() => {
    // 0. Connect via isolated native authenticated bridge in desktop mode
    const initBackend = async () => {
      let endpoint = '';
      const inTauri = isTauri() || typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
      if (inTauri) {
        for (let attempt = 0; attempt < 6; attempt++) {
          try {
            endpoint = await invoke<string>('get_gateway_endpoint');
            if (endpoint) break;
          } catch {
            await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
          }
        }
      }

      if (endpoint) {
        useSubbuStore.getState().updateBackendConfig({
          openclawWsUrl: endpoint,
        });
      }
      adapter.connect();
    };
    initBackend();

    // 1. Connection status listener
    const unsubStatus = adapter.onStatusChange((status, detail) => {
      setConnectionStatus(status, detail);
    });

    // 2. Gateway Event listener
    const unsubEvent = adapter.onEvent((event, payload) => {
      if (event === 'exec.approval.requested') {
        addApprovalRequest({
          id: payload.id || `appr-${Date.now()}`,
          command: payload.command || 'system.run',
          cwd: payload.cwd,
          riskLevel: payload.riskLevel || 'high',
          requestedAt: Date.now(),
        });
        setExpression('curious');
        setGesture('pointing');
      } else if (event === 'voicewake.changed') {
        if (payload?.state === 'listening') {
          setVoiceState('listening');
          setExpression('listening');
        }
      }
    });

    // 3. Voice callbacks & VAD barge-in
    adapter.voice.setCallbacks(
      (state) => {
        setVoiceState(state);
        if (state === 'listening') {
          setExpression('listening');
        } else if (state === 'idle') {
          setExpression('neutral');
        }
      },
      (freq, rms) => {
        setAudioTelemetry(freq, rms);
      },
      (transcript, isFinal) => {
        // Transcript updates handled if needed
      },
      () => {
        // Barge-in: user spoke while Subbu was talking -> abort current generation
        adapter.abortChat();
      }
    );

    // 4. Fetch sessions and Ollama models
    adapter.getSessions().then((s) => {
      if (s.length > 0) setSessions(s);
    });
    adapter.getOllamaModels().then((models) => {
      setInstalledModels(models);
      if (models.length > 0) {
        setCurrentModelName(models[0].name);
      }
    });

    return () => {
      unsubStatus();
      unsubEvent();
      adapter.disconnect();
    };
  }, [adapter]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-canvas-base select-none">
      {/* Ambient background aura glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-canvas-blush/60 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-canvas-lavender/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Zone 1: Center Companion Stage */}
      <main className="absolute inset-0 z-10">
        <SubbuStageCanvas />
        <ThoughtBubble />
        <LiveCaptionCard />
      </main>

      {/* Zone 2: Top Status / Call Capsule */}
      <TopStatusCapsule />

      {/* Zone 3: Left Floating Navigation Dock */}
      <LeftNavDock />

      {/* Zone 4: Right Context Drawer */}
      <RightContextDrawer />

      {/* Zone 5: Bottom Floating Composer */}
      <FloatingComposer />

      {/* Executive Approvals Modal Gate */}
      <Suspense fallback={null}>
        <ApprovalModal />
      </Suspense>

      {/* Real Developer / System Status Dashboard */}
      <Suspense fallback={null}>
        <SystemStatusModal />
      </Suspense>

      {/* Spotlight Quick Command Overlay (Ctrl+K / Alt+Space) */}
      <Suspense fallback={null}>
        <QuickCommandOverlay />
      </Suspense>

      {/* Model Selector Modal */}
      <Suspense fallback={null}>
        <ModelSelectorModal />
      </Suspense>
    </div>
  );
};

