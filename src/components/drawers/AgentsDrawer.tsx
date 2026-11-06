import React from 'react';
import { Users, CheckCircle, Shield } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const AgentsDrawer: React.FC = () => {
  const agents = useSubbuStore((state) => state.agents);
  const activeAgentId = useSubbuStore((state) => state.activeAgentId);
  const setActiveAgentId = useSubbuStore((state) => state.setActiveAgentId);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Registered Specialist Agents
      </span>

      <div className="space-y-2.5">
        {agents.map((agent) => {
          const isActive = activeAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-sakura-100/80 border-sakura-300 shadow-sm'
                  : 'bg-white/70 border-white/90 hover:bg-white/90'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-display font-semibold text-ink-primary">
                    {agent.name}
                  </span>
                </div>
                {isActive ? (
                  <span className="text-[10px] font-mono font-bold text-sakura-700 uppercase bg-sakura-200/80 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    className="text-xs py-1 px-2.5"
                    onClick={() => setActiveAgentId(agent.id)}
                  >
                    Select
                  </GlassButton>
                )}
              </div>

              <p className="text-xs font-sans text-ink-secondary mb-2 leading-relaxed">
                {agent.description}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 text-ink-muted border border-white"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

