import React from 'react';
import {
  Home,
  MessageSquare,
  Mic,
  CheckSquare,
  Users,
  Brain,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { useSubbuStore, ActiveDrawer } from '../../store/useSubbuStore';
import { GlassPanel } from '../ui/GlassPanel';

interface NavItem {
  id: ActiveDrawer;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LeftNavDock: React.FC = () => {
  const activeDrawer = useSubbuStore((state) => state.activeDrawer);
  const setActiveDrawer = useSubbuStore((state) => state.setActiveDrawer);
  const stageOnlyMode = useSubbuStore((state) => state.stageOnlyMode);

  if (stageOnlyMode) return null;

  const items: NavItem[] = [
    { id: null, label: 'Stage', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav aria-label="Main Navigation" className="absolute left-6 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
      <GlassPanel
        elevated
        className="py-3 px-2 flex flex-col items-center gap-1.5 rounded-3xl shadow-capsule"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeDrawer === item.id;

          return (
            <button
              key={item.label}
              onClick={() => setActiveDrawer(item.id)}
              title={item.label}
              className={`group relative p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-sakura-300 text-sakura-700 shadow-sm scale-105'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-white/80 active:scale-95'
              }`}
            >
              <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

              {/* Hover Tooltip Pill */}
              <span className="absolute left-full ml-3.5 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-white/95 text-ink-primary text-xs font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 shadow-glass whitespace-nowrap z-40">
                {item.label}
              </span>
            </button>
          );
        })}
      </GlassPanel>
    </nav>
  );
};

