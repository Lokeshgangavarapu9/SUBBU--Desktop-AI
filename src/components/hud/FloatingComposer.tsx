import React, { useState, useRef } from 'react';
import { Send, Square, Paperclip, X } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassPanel } from '../ui/GlassPanel';
import { MicButton3Mode } from './MicButton3Mode';

export const FloatingComposer: React.FC = () => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stageOnlyMode = useSubbuStore((state) => state.stageOnlyMode);
  const isGenerating = useSubbuStore((state) => state.isGenerating);
  const activeSessionId = useSubbuStore((state) => state.activeSessionId);
  const messages = useSubbuStore((state) => state.messages);
  const currentModelName = useSubbuStore((state) => state.currentModelName);
  const activeAgentId = useSubbuStore((state) => state.activeAgentId);
  const adapter = useSubbuStore((state) => state.adapter);
  const addMessage = useSubbuStore((state) => state.addMessage);
  const updateLastMessage = useSubbuStore((state) => state.updateLastMessage);
  const setIsGenerating = useSubbuStore((state) => state.setIsGenerating);
  const setStreamingText = useSubbuStore((state) => state.setStreamingText);
  const setActiveThought = useSubbuStore((state) => state.setActiveThought);
  const attachedFiles = useSubbuStore((state) => state.attachedFiles);
  const attachFile = useSubbuStore((state) => state.attachFile);
  const removeAttachedFile = useSubbuStore((state) => state.removeAttachedFile);
  const clearAttachedFiles = useSubbuStore((state) => state.clearAttachedFiles);
  const setExpression = useSubbuStore((state) => state.setExpression);

  if (stageOnlyMode) return null;

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const textExtensions = ['txt', 'md', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'py', 'rs', 'yaml', 'yml', 'xml', 'log', 'sh', 'bat', 'cmd', 'toml'];
      const isText = file.type.startsWith('text/') || textExtensions.includes(ext) || file.type.includes('json');

      if (!isText) {
        resolve(`[File: ${file.name} (${(file.size / 1024).toFixed(1)} KB, binary/unsupported text format)]`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const content = (reader.result as string) || '';
        const truncated = content.length > 8000 ? content.slice(0, 8000) + '\n...[truncated for context limits]' : content;
        resolve(`[File: ${file.name}]\n\`\`\`${ext}\n${truncated}\n\`\`\``);
      };
      reader.onerror = () => {
        resolve(`[Error reading file: ${file.name}]`);
      };
      reader.readAsText(file);
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && attachedFiles.length === 0) return;
    if (isGenerating) return;

    setInput('');
    setIsGenerating(true);
    setStreamingText('');
    setActiveThought(null);
    setExpression('thinking');

    // Read attached files context
    let fileContext = '';
    if (attachedFiles.length > 0) {
      const contexts = await Promise.all(attachedFiles.map(readFileContent));
      fileContext = contexts.join('\n\n');
      clearAttachedFiles();
    }

    // Add user message
    addMessage({
      id: `user-${Date.now()}`,
      sessionId: activeSessionId,
      role: 'user',
      content: text || (fileContext ? 'Please inspect the attached file(s).' : ''),
      timestamp: Date.now(),
    });

    // Placeholder assistant message for streaming
    addMessage({
      id: `assistant-${Date.now()}`,
      sessionId: activeSessionId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    });

    try {
      await adapter.sendMessage(
        text || 'Please inspect the attached file(s).',
        activeSessionId,
        (delta, fullText, emotion, thought) => {
          setStreamingText(fullText);
          updateLastMessage({ content: fullText, emotion, thought });
          if (emotion) setExpression(emotion as any);
          if (thought) setActiveThought(thought);
        },
        (finalText, emotion) => {
          setIsGenerating(false);
          setStreamingText('');
          setActiveThought(null);
          updateLastMessage({ content: finalText, emotion, streaming: false });
          if (emotion) setExpression(emotion as any);
          // Trigger TTS speech
          adapter.voice.speak(finalText);
        },
        (err) => {
          setIsGenerating(false);
          setStreamingText('');
          setActiveThought(null);
          updateLastMessage({
            content: `Error: ${err.message || 'Failed to complete generation'}`,
            streaming: false,
          });
          setExpression('confused');
        },
        {
          model: currentModelName,
          agentId: activeAgentId,
          history: messages.filter((m) => m.sessionId === activeSessionId),
          fileContext: fileContext || undefined,
        }
      );
    } catch (e: any) {
      setIsGenerating(false);
      updateLastMessage({
        content: `Error: ${e.message}`,
        streaming: false,
      });
      setExpression('confused');
    }
  };

  const handleStop = async () => {
    await adapter.abortChat(activeSessionId);
    setIsGenerating(false);
    setStreamingText('');
    setActiveThought(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      attachFile(e.target.files[0]);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
      {/* Attached Files Pills */}
      {attachedFiles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {attachedFiles.map((f, i) => (
            <div
              key={i}
              className="px-3 py-1 bg-white/80 backdrop-blur-md rounded-full border border-sakura-200 text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Paperclip className="w-3 h-3 text-sakura-600" />
              <span className="truncate max-w-[140px] text-ink-primary font-medium">{f.name}</span>
              <button
                onClick={() => removeAttachedFile(i)}
                className="hover:text-rose-600 text-ink-muted cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <GlassPanel
        elevated
        className={`px-3 py-2 flex items-center gap-2 rounded-3xl shadow-capsule transition-all duration-300 ${
          isFocused || input.length > 0 ? 'w-[640px]' : 'w-[440px]'
        }`}
      >
        {/* Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file (Max 20MB)"
          className="p-2.5 rounded-2xl hover:bg-sakura-100 text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input Area */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Talk to Subbu... (Shift+Enter for new line)"
          rows={1}
          className="flex-1 bg-transparent border-0 outline-hidden text-sm font-sans text-ink-primary placeholder:text-ink-muted resize-none max-h-24 py-1.5 px-1"
        />

        {/* Stop Generation or Send Button */}
        {isGenerating ? (
          <button
            onClick={handleStop}
            title="Stop Generation"
            className="p-2.5 rounded-2xl bg-status-errorBg hover:bg-rose-100 text-status-errorText transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() && attachedFiles.length === 0}
            title="Send message"
            className="p-2.5 rounded-2xl bg-sakura-300 hover:bg-sakura-400 text-sakura-700 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        )}

        <div className="h-5 w-[1px] bg-ink-faint/30" />

        {/* 3-Mode Hero Microphone */}
        <MicButton3Mode />
      </GlassPanel>
    </div>
  );
};

