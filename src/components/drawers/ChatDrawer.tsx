import React, { useRef, useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Plus,
  Terminal,
  RotateCw,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Eraser,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';
import type { ChatMessage } from '../../types/openclaw';

interface MessageItemProps {
  msg: ChatMessage;
  copiedId: string | null;
  isSpeaking: boolean;
  onCopy: (id: string, text: string) => void;
  onToggleSpeech: (id: string, text: string) => void;
  onRegenerate?: (msgId: string) => void;
  onEditAndResend?: (text: string) => void;
}

const ChatMessageItem = React.memo<MessageItemProps>(
  ({ msg, copiedId, isSpeaking, onCopy, onToggleSpeech, onRegenerate, onEditAndResend }) => {
    const isUser = msg.role === 'user';
    const [thoughtExpanded, setThoughtExpanded] = useState(false);

    return (
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} group`}>
        {!isUser && msg.emotion && (
          <span className="text-[10px] uppercase font-semibold text-sakura-600 px-1.5 tracking-wider">
            {msg.emotion}
          </span>
        )}

        {/* Thought / Reasoning Collapsible (if available) */}
        {!isUser && msg.thought && (
          <div className="max-w-[85%] mb-1">
            <button
              onClick={() => setThoughtExpanded(!thoughtExpanded)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-ink-muted hover:text-sakura-700 bg-white/50 px-2 py-0.5 rounded-md border border-sakura-200/50 transition-colors cursor-pointer"
            >
              <BrainCircuit className="w-3 h-3 text-sakura-500" />
              <span>{thoughtExpanded ? 'Hide thoughts' : 'View thoughts'}</span>
              {thoughtExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {thoughtExpanded && (
              <div className="mt-1 p-2.5 rounded-xl bg-sakura-50/50 border border-sakura-200/40 text-[11px] font-mono text-ink-secondary whitespace-pre-wrap leading-relaxed">
                {msg.thought}
              </div>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed transition-all shadow-sm ${
            isUser
              ? 'bg-sakura-200/60 text-ink-primary rounded-br-xs border border-sakura-300/50'
              : 'bg-white/90 text-ink-primary rounded-bl-xs border border-white/95 shadow-glass'
          }`}
        >
          <p className="whitespace-pre-wrap font-sans select-text">{msg.content}</p>

          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-sakura-100/60 flex flex-col gap-1.5">
              {msg.toolCalls.map((t: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-sakura-50/70 p-2 rounded-xl text-xs font-mono text-ink-secondary flex items-center gap-1.5 border border-sakura-200/50"
                >
                  <Terminal className="w-3.5 h-3.5 text-sakura-600" />
                  <span className="font-semibold text-sakura-700">{t.name}</span>
                  <span className="text-[10px] text-ink-muted">({t.status})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-ink-muted font-mono">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* Copy Button */}
          <button
            onClick={() => onCopy(msg.id, msg.content)}
            title="Copy text"
            className="p-1 text-ink-muted hover:text-sakura-600 cursor-pointer transition-colors"
          >
            {copiedId === msg.id ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>

          {/* User message actions */}
          {isUser && onEditAndResend && (
            <button
              onClick={() => onEditAndResend(msg.content)}
              title="Edit & Resend"
              className="p-1 text-ink-muted hover:text-sakura-600 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}

          {/* Assistant message actions */}
          {!isUser && (
            <>
              <button
                onClick={() => onToggleSpeech(msg.id, msg.content)}
                title={isSpeaking ? 'Stop speaking' : 'Speak message aloud'}
                className="p-1 text-ink-muted hover:text-sakura-600 cursor-pointer transition-colors"
              >
                {isSpeaking ? (
                  <VolumeX className="w-3 h-3 text-sakura-600 animate-pulse" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
              {onRegenerate && (
                <button
                  onClick={() => onRegenerate(msg.id)}
                  title="Regenerate response"
                  className="p-1 text-ink-muted hover:text-sakura-600 cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

ChatMessageItem.displayName = 'ChatMessageItem';

export const ChatDrawer: React.FC = () => {
  const messages = useSubbuStore((state) => state.messages);
  const sessions = useSubbuStore((state) => state.sessions);
  const activeSessionId = useSubbuStore((state) => state.activeSessionId);
  const setActiveSessionId = useSubbuStore((state) => state.setActiveSessionId);
  const adapter = useSubbuStore((state) => state.adapter);
  const activeAgentId = useSubbuStore((state) => state.activeAgentId);
  const currentModelName = useSubbuStore((state) => state.currentModelName);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Filter messages for current active session (or all if untagged legacy)
  const currentSessionMessages = React.useMemo(() => {
    return messages.filter(
      (m) => !m.sessionId || m.sessionId === activeSessionId
    );
  }, [messages, activeSessionId]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionMessages.length, messages]);

  const handleCopy = React.useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleToggleSpeech = React.useCallback((id: string, text: string) => {
    if (speakingMsgId === id) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(id);
      adapter.voice.speak(text);
      if ('speechSynthesis' in window) {
        const checkEnd = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setSpeakingMsgId(null);
            clearInterval(checkEnd);
          }
        }, 300);
      }
    }
  }, [speakingMsgId, adapter]);

  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: `Conversation ${sessions.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    useSubbuStore.getState().setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const handleClearCurrentSession = () => {
    useSubbuStore.getState().clearSessionMessages(activeSessionId);
    setConfirmClearOpen(false);
  };

  const handleDeleteCurrentSession = () => {
    if (sessions.length <= 1) {
      // Just clear if it's the only session
      useSubbuStore.getState().clearSessionMessages(activeSessionId);
    } else {
      useSubbuStore.getState().deleteSession(activeSessionId);
    }
    setConfirmDeleteOpen(false);
  };

  const handleRegenerate = async (msgId: string) => {
    // Find the assistant message and the user message directly preceding it
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx <= 0) return;

    let targetUserMsg: ChatMessage | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        targetUserMsg = messages[i];
        break;
      }
    }

    if (!targetUserMsg) return;

    // Delete the old assistant message and re-send the prompt
    useSubbuStore.getState().deleteMessage(msgId);
    const newAssistantId = `assistant-${Date.now()}`;
    useSubbuStore.getState().addMessage({
      id: newAssistantId,
      sessionId: activeSessionId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    });

    await adapter.sendMessage(
      targetUserMsg.content,
      activeSessionId,
      (_delta, fullText, emotion, thought) => {
        useSubbuStore.getState().updateMessage(newAssistantId, { content: fullText, emotion, thought });
      },
      (finalText, emotion) => {
        useSubbuStore.getState().updateMessage(newAssistantId, { content: finalText, emotion, streaming: false });
        adapter.voice.speak(finalText);
      },
      (err) => {
        useSubbuStore.getState().updateMessage(newAssistantId, {
          content: `Error: ${err.message || 'Generation failed'}`,
          streaming: false,
        });
      },
      {
        model: currentModelName,
        agentId: activeAgentId,
        history: messages.slice(0, idx - 1),
      }
    );
  };

  const handleEditAndResend = (text: string) => {
    // Fill the composer with the text so user can refine it
    const textarea = document.querySelector('textarea[placeholder*="Ask Subbu"]') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = text;
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Session Header Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-sakura-100/80 gap-2">
        <select
          value={activeSessionId}
          onChange={(e) => setActiveSessionId(e.target.value)}
          aria-label="Active Conversation Session"
          className="text-xs font-sans font-medium bg-white/70 border border-white/90 rounded-xl px-2.5 py-1.5 text-ink-primary outline-hidden flex-1 truncate"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <GlassButton size="sm" variant="secondary" onClick={handleNewSession} title="New conversation">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </GlassButton>

          <button
            onClick={() => setConfirmClearOpen(true)}
            title="Clear current conversation messages"
            className="p-1.5 text-ink-muted hover:text-amber-600 hover:bg-amber-50/50 rounded-lg transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {sessions.length > 1 && (
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              title="Delete conversation"
              className="p-1.5 text-ink-muted hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Banner for Clear */}
      {confirmClearOpen && (
        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>Clear messages in this conversation?</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearCurrentSession}
              className="px-2 py-0.5 bg-amber-600 text-white rounded-md font-medium text-[11px] cursor-pointer hover:bg-amber-700"
            >
              Clear
            </button>
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="px-2 py-0.5 bg-white border border-amber-300 text-amber-800 rounded-md text-[11px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Banner for Delete */}
      {confirmDeleteOpen && (
        <div className="p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-2">
          <span>Delete entire conversation session?</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDeleteCurrentSession}
              className="px-2 py-0.5 bg-rose-600 text-white rounded-md font-medium text-[11px] cursor-pointer hover:bg-rose-700"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDeleteOpen(false)}
              className="px-2 py-0.5 bg-white border border-rose-300 text-rose-800 rounded-md text-[11px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {currentSessionMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-muted">
            <div className="w-10 h-10 rounded-full bg-sakura-100/60 flex items-center justify-center text-sakura-500 mb-2">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-ink-secondary">No messages yet</p>
            <p className="text-xs text-ink-muted mt-1 max-w-[200px]">
              Type a prompt or voice command to start conversing with Subbu.
            </p>
          </div>
        ) : (
          currentSessionMessages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              copiedId={copiedId}
              isSpeaking={speakingMsgId === msg.id}
              onCopy={handleCopy}
              onToggleSpeech={handleToggleSpeech}
              onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
              onEditAndResend={msg.role === 'user' ? handleEditAndResend : undefined}
            />
          ))
        )}
        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
