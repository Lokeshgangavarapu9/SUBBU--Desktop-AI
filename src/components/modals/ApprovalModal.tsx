import React from 'react';
import { ShieldAlert, Terminal, Folder, Check, X } from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const ApprovalModal: React.FC = () => {
  const approvalRequests = useSubbuStore((state) => state.approvalRequests);
  const removeApprovalRequest = useSubbuStore((state) => state.removeApprovalRequest);
  const adapter = useSubbuStore((state) => state.adapter);

  if (approvalRequests.length === 0) return null;

  const current = approvalRequests[0];

  const handleApprove = async () => {
    await adapter.resolveApproval(current.id, true);
    removeApprovalRequest(current.id);
  };

  const handleDeny = async () => {
    await adapter.resolveApproval(current.id, false, 'User denied action');
    removeApprovalRequest(current.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4 pointer-events-auto">
      <div className="bg-white/90 backdrop-blur-elevated border border-white/95 rounded-3xl p-6 shadow-glass max-w-lg w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-display font-bold text-ink-primary">
              Executive Approval Required
            </h3>
            <span className="text-xs text-ink-secondary">
              A desktop action or command requires your explicit authorization.
            </span>
          </div>
        </div>

        {/* Command Details Card */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between text-ink-muted text-[11px]">
            <span>COMMAND</span>
            <span className="uppercase font-bold text-amber-700 px-2 py-0.5 rounded-full bg-amber-200/80">
              {current.riskLevel || 'High Risk'}
            </span>
          </div>
          <div className="p-2.5 bg-white/80 rounded-xl text-ink-primary font-semibold break-all border border-amber-200/60">
            {current.command}
          </div>

          {current.cwd && (
            <div className="flex items-center gap-1.5 text-ink-secondary text-[11px] pt-1">
              <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Working Dir: {current.cwd}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <GlassButton
            variant="danger"
            onClick={handleDeny}
            className="px-5 py-2.5"
          >
            <X className="w-4 h-4" />
            <span>Deny Action</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            onClick={handleApprove}
            className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>Approve Once</span>
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

