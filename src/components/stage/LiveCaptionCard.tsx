import React, { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';

export const LiveCaptionCard: React.FC = () => {
  const streamingText = useSubbuStore((state) => state.streamingText);
  const messages = useSubbuStore((state) => state.messages);
  const activeSessionId = useSubbuStore((state) => state.activeSessionId);
  const isGenerating = useSubbuStore((state) => state.isGenerating);
  const activeDrawer = useSubbuStore((state) => state.activeDrawer);
  const adapter = useSubbuStore((state) => state.adapter);
  const [dismissedMsgId, setDismissedMsgId] = useState<string | null>(null);

  // If Chat Drawer is open, captions are already shown in the chat list
  if (activeDrawer === 'chat') return null;

  const sessionMessages = messages.filter((m) => !m.sessionId || m.sessionId === activeSessionId);
  const lastAssistantMsg = [...sessionMessages].reverse().find((m) => m.role === 'assistant' && m.content && m.content.trim().length > 0);

  // Don't show permanently if dismissed or if it's the static welcome message and user hasn't interacted
  if (!isGenerating && (!lastAssistantMsg || dismissedMsgId === lastAssistantMsg.id)) {
    return null;
  }

  const displayText = isGenerating ? streamingText : lastAssistantMsg?.content;
  if (!displayText || !displayText.trim()) return null;

  const handleReplay = () => {
    if (displayText) {
      adapter.voice.speak(displayText);
    }
  };

  const handleDismiss = () => {
    if (lastAssistantMsg) {
      setDismissedMsgId(lastAssistantMsg.id);
    }
  };

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-xl w-[90%] z-20 pointer-events-auto animate-fade-in">
      <div className="bg-white/80 backdrop-blur-md border border-white/90 p-3.5 rounded-2xl shadow-glass flex items-start justify-between gap-3 transition-all hover:bg-white/90">
        <div className="flex flex-col gap-1 overflow-hidden flex-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sakura-500 animate-pulse" />
            <span className="text-[10px] font-sans uppercase tracking-wider font-semibold text-sakura-600">
              {isGenerating ? 'Subbu is thinking...' : (lastAssistantMsg?.emotion || 'Latest Response')}
            </span>
          </div>
          <p className="text-sm font-sans text-ink-primary leading-snug line-clamp-2">
            {displayText}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReplay}
            title="Read aloud"
            className="p-1.5 rounded-xl hover:bg-sakura-100 text-ink-secondary hover:text-sakura-600 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          {!isGenerating && (
            <button
              onClick={handleDismiss}
              title="Dismiss caption"
              className="p-1.5 rounded-xl hover:bg-rose-100 text-ink-muted hover:text-rose-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

