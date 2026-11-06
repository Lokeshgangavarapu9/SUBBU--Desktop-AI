/**
 * src/components/modals/QuickCommandOverlay.tsx
 * Spotlight-style quick command overlay for SUBBU.
 * Triggered via Ctrl+K, Alt+Space, or HUD launcher.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Calculator, FileText, Globe, Calendar, Clock, Activity, Zap, X } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassPanel } from '../ui/GlassPanel';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const QuickCommandOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const adapter = useSubbuStore((state) => state.adapter);
  const setStatusDashboardOpen = useSubbuStore((state) => state.setStatusDashboardOpen);
  const setQualityPreset = useSubbuStore((state) => state.setQualityPreset);
  const startTimer = useSubbuStore((state) => state.startTimer);
  const setActiveDrawer = useSubbuStore((state) => state.setActiveDrawer);

  const commands: CommandItem[] = [
    {
      id: 'notepad',
      title: 'Open Notepad',
      category: 'Desktop Automation',
      icon: FileText,
      action: () => {
        adapter.desktop.client.launch({ app: 'notepad' });
      },
    },
    {
      id: 'calculator',
      title: 'Open Calculator',
      category: 'Desktop Automation',
      icon: Calculator,
      action: () => {
        adapter.desktop.client.launch({ app: 'calc' });
      },
    },
    {
      id: 'browser',
      title: 'Launch Browser',
      category: 'Navigation',
      icon: Globe,
      action: () => {
        window.open('http://localhost:5173', '_blank');
      },
    },
    {
      id: 'calendar',
      title: 'Open Google Calendar',
      category: 'Productivity',
      icon: Calendar,
      action: () => {
        window.open('https://calendar.google.com', '_blank');
      },
    },
    {
      id: 'timer-1m',
      title: 'Start 1-Minute Timer',
      category: 'Utilities',
      icon: Clock,
      action: () => {
        startTimer(60, '1-Minute Focus Timer');
      },
    },
    {
      id: 'status',
      title: 'Open System Status & Diagnostics',
      category: 'System',
      icon: Activity,
      action: () => {
        setStatusDashboardOpen(true);
      },
    },
    {
      id: 'eco-mode',
      title: 'Toggle Low Resource Mode (Eco)',
      category: 'Performance',
      icon: Zap,
      action: () => {
        const current = useSubbuStore.getState().qualityPreset;
        setQualityPreset(current === 'eco' ? 'balanced' : 'eco');
      },
    },
    {
      id: 'chat-history',
      title: 'Show Conversation History',
      category: 'Companion',
      icon: Terminal,
      action: () => {
        setActiveDrawer('chat');
      },
    },
  ];

  // Listen for global shortcut (Ctrl+K or Alt+Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.altKey && e.code === 'Space')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd: CommandItem) => {
    setIsOpen(false);
    cmd.action();
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <GlassPanel elevated className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-white/40 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/60 gap-3 bg-white/70">
          <Search className="w-5 h-5 text-sakura-600" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInInput}
            placeholder="Search commands, tools, or shortcuts... (Esc to close)"
            className="flex-1 bg-transparent text-sm font-sans text-ink-primary outline-hidden placeholder:text-ink-muted"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Results */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-sakura-100 text-sakura-900 font-medium' : 'hover:bg-white/60 text-ink-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-sakura-600' : 'text-ink-muted'}`} />
                    <span className="text-xs">{cmd.title}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono uppercase tracking-wider">{cmd.category}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-white/60 bg-sakura-50/40 flex items-center justify-between text-[10px] text-ink-muted">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Ctrl+K</kbd> anywhere</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white">↑↓</kbd> Navigate &nbsp; <kbd className="px-1.5 py-0.5 rounded bg-white">↵</kbd> Select</span>
        </div>
      </GlassPanel>
    </div>
  );
};
