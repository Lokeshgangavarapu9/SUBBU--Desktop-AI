import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassPanel } from '../ui/GlassPanel';

// Lazy-loaded context drawers to avoid heavy synchronous main thread blocking
const ChatDrawer = lazy(() => import('./ChatDrawer').then((m) => ({ default: m.ChatDrawer })));
const VoiceDrawer = lazy(() => import('./VoiceDrawer').then((m) => ({ default: m.VoiceDrawer })));
const TasksDrawer = lazy(() => import('./TasksDrawer').then((m) => ({ default: m.TasksDrawer })));
const AgentsDrawer = lazy(() => import('./AgentsDrawer').then((m) => ({ default: m.AgentsDrawer })));
const MemoryDrawer = lazy(() => import('./MemoryDrawer').then((m) => ({ default: m.MemoryDrawer })));
const FilesDrawer = lazy(() => import('./FilesDrawer').then((m) => ({ default: m.FilesDrawer })));
const SettingsModal = lazy(() => import('../modals/SettingsModal').then((m) => ({ default: m.SettingsModal })));

const DrawerLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-48 gap-2 text-ink-muted">
    <Loader2 className="w-5 h-5 animate-spin text-sakura-500" />
    <span className="text-xs">Loading panel...</span>
  </div>
);

export const RightContextDrawer: React.FC = () => {
  const activeDrawer = useSubbuStore((state) => state.activeDrawer);
  const setActiveDrawer = useSubbuStore((state) => state.setActiveDrawer);
  const reducedAnimation = useSubbuStore((state) => state.reducedAnimation);

  if (!activeDrawer) return null;

  const titles: Record<string, string> = {
    chat: 'Conversation History',
    voice: 'Voice & Call Studio',
    tasks: 'Active Tasks & Approvals',
    agents: 'Specialist Agents',
    memory: 'Companion Memory',
    files: 'Workspace Files',
    settings: 'Settings & Telemetry',
  };

  return (
    <AnimatePresence>
      {activeDrawer && (
        <motion.aside
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{
            type: reducedAnimation ? 'tween' : 'spring',
            stiffness: 300,
            damping: 30,
            duration: reducedAnimation ? 0.1 : undefined,
          }}
          className="absolute right-6 top-6 bottom-6 w-[400px] z-25 pointer-events-auto flex flex-col"
        >
          <GlassPanel
            elevated
            className="w-full h-full p-4 flex flex-col rounded-3xl shadow-glass overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/80">
              <h2 className="text-base font-display font-semibold text-ink-primary">
                {titles[activeDrawer] || 'Details'}
              </h2>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1.5 rounded-xl hover:bg-sakura-100 text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              <Suspense fallback={<DrawerLoadingFallback />}>
                {activeDrawer === 'chat' && <ChatDrawer />}
                {activeDrawer === 'voice' && <VoiceDrawer />}
                {activeDrawer === 'tasks' && <TasksDrawer />}
                {activeDrawer === 'agents' && <AgentsDrawer />}
                {activeDrawer === 'memory' && <MemoryDrawer />}
                {activeDrawer === 'files' && <FilesDrawer />}
                {activeDrawer === 'settings' && <SettingsModal />}
              </Suspense>
            </div>
          </GlassPanel>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

