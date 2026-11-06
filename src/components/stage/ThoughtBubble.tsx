import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';

export const ThoughtBubble: React.FC = () => {
  const activeThought = useSubbuStore((state) => state.activeThought);
  const isGenerating = useSubbuStore((state) => state.isGenerating);
  const reducedAnimation = useSubbuStore((state) => state.reducedAnimation);

  if (!activeThought && !isGenerating) return null;

  return (
    <AnimatePresence>
      {(activeThought || isGenerating) && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: reducedAnimation ? 0.05 : 0.25 }}
          className="absolute top-28 right-16 max-w-xs z-20 pointer-events-none"
        >
          <div className="bg-lavender-100/80 backdrop-blur-md border border-lavender-300/80 text-lavender-700 p-3.5 rounded-3xl shadow-glass flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-lavender-500 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-lavender-500 font-semibold">
                Status
              </span>
              <p className="text-xs font-sans text-ink-primary leading-relaxed line-clamp-2">
                {(() => {
                  if (activeThought) {
                    // Suppress any raw reasoning / <think> leakage
                    if (activeThought.includes('<think>') || activeThought.length > 80 || activeThought.includes('```')) {
                      return 'Thinking and preparing response...';
                    }
                    // Filter raw reasoning words
                    const lower = activeThought.toLowerCase();
                    if (lower.includes('desktop') || lower.includes('window') || lower.includes('app')) {
                      return 'Checking desktop tools...';
                    }
                    if (lower.includes('search') || lower.includes('file')) {
                      return 'Working on task...';
                    }
                    return activeThought;
                  }
                  return 'Thinking...';
                })()}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

