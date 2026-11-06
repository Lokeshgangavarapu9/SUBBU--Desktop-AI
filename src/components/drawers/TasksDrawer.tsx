import React from 'react';
import { Play, CheckCircle2, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const TasksDrawer: React.FC = () => {
  const activeTasks = useSubbuStore((state) => state.activeTasks);
  const approvalRequests = useSubbuStore((state) => state.approvalRequests);
  const adapter = useSubbuStore((state) => state.adapter);
  const removeApprovalRequest = useSubbuStore((state) => state.removeApprovalRequest);

  const handleApprove = async (id: string) => {
    await adapter.resolveApproval(id, true);
    removeApprovalRequest(id);
  };

  const handleDeny = async (id: string) => {
    await adapter.resolveApproval(id, false, 'User denied from task drawer');
    removeApprovalRequest(id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Pending Approvals Section */}
      {approvalRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Action Approvals Required ({approvalRequests.length})</span>
          </div>

          {approvalRequests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl flex flex-col gap-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-amber-900 truncate">
                  {req.command}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                  {req.riskLevel || 'High'}
                </span>
              </div>
              {req.cwd && (
                <span className="text-[11px] font-mono text-amber-700 truncate">
                  Dir: {req.cwd}
                </span>
              )}
              <div className="flex items-center gap-2 pt-1">
                <GlassButton
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 border-none flex-1"
                  onClick={() => handleApprove(req.id)}
                >
                  Approve
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDeny(req.id)}
                >
                  Deny
                </GlassButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Active Tasks */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Active Tasks & Operations
        </span>

        {activeTasks.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-muted bg-white/40 rounded-2xl border border-white/60">
            <Clock className="w-5 h-5 mx-auto mb-2 text-ink-faint" />
            <span>No background tasks currently running.</span>
          </div>
        ) : (
          activeTasks.map((t) => (
            <div
              key={t.id}
              className="p-3.5 bg-white/80 border border-white/95 rounded-2xl flex flex-col gap-2 shadow-glass"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-sans font-semibold text-ink-primary">
                  {t.title}
                </span>
                <span className="text-xs font-mono font-medium text-sakura-600">
                  {t.status}
                </span>
              </div>

              {t.currentOperation && (
                <p className="text-xs text-ink-secondary font-sans">{t.currentOperation}</p>
              )}

              {t.toolEvents && t.toolEvents.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-sakura-100">
                  {t.toolEvents.slice(-3).map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-ink-muted font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-sakura-400" />
                      <span>{ev.toolName}</span>
                      <span className="text-[10px]">({ev.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

