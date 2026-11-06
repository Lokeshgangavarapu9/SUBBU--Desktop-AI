import React, { useRef } from 'react';
import { Mic, MicOff, Radio, Volume2 } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { MicMode } from '../../types/voice';

export const MicButton3Mode: React.FC = () => {
  const voiceState = useSubbuStore((state) => state.voiceState);
  const micMode = useSubbuStore((state) => state.micMode);
  const setMicMode = useSubbuStore((state) => state.setMicMode);
  const adapter = useSubbuStore((state) => state.adapter);
  const isListening = voiceState === 'listening';
  const isSpeaking = voiceState === 'speaking';
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Mode Cycle (Tap on indicator pill)
  const cycleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: MicMode[] = ['dictation', 'ptt', 'continuous'];
    const next = modes[(modes.indexOf(micMode) + 1) % modes.length];
    setMicMode(next);
    adapter.voice.setMode(next);
  };

  // Click Handler for Tap & Toggle modes
  const handleClick = async () => {
    if (micMode === 'ptt') return; // Handled by pointer down/up

    if (isListening) {
      adapter.voice.stopListening();
    } else {
      await adapter.voice.startListening();
    }
  };

  // Push-To-Talk Pointer Handlers
  const handlePointerDown = async () => {
    if (micMode !== 'ptt') return;
    holdTimerRef.current = setTimeout(async () => {
      await adapter.voice.startListening();
    }, 100);
  };

  const handlePointerUp = () => {
    if (micMode !== 'ptt') return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    adapter.voice.stopListening();
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* 3-Mode Indicator Switch Pill */}
      <button
        onClick={cycleMode}
        title={`Current Voice Mode: ${micMode.toUpperCase()}. Click to cycle.`}
        className="text-[10px] uppercase font-mono font-semibold px-2 py-1 rounded-full bg-sakura-100 text-sakura-700 hover:bg-sakura-200 transition-colors cursor-pointer border border-sakura-300"
      >
        {micMode === 'dictation' ? 'Tap' : micMode === 'ptt' ? 'Hold' : 'Call'}
      </button>

      {/* Hero Microphone Button */}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        title={
          isListening
            ? 'Stop Listening'
            : micMode === 'ptt'
            ? 'Hold to Speak (Walkie-Talkie)'
            : 'Start Voice Conversation'
        }
        className={`relative p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isListening
            ? 'bg-sakura-400 text-sakura-700 shadow-md ring-4 ring-sakura-300/40 animate-pulse'
            : isSpeaking
            ? 'bg-lavender-200 text-lavender-700 shadow-sm'
            : 'bg-white/80 hover:bg-sakura-100 text-ink-primary border border-white hover:border-sakura-300'
        }`}
      >
        {isListening ? (
          <Radio className="w-5 h-5 text-sakura-700" />
        ) : isSpeaking ? (
          <Volume2 className="w-5 h-5 text-lavender-700 animate-bounce" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

