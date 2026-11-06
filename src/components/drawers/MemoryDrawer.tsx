import React, { useState } from 'react';
import {
  Search,
  Brain,
  Trash2,
  Calendar,
  Plus,
  Edit2,
  Check,
  X,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const MemoryDrawer: React.FC = () => {
  const memories = useSubbuStore((state) => state.memories);
  const addMemory = useSubbuStore((state) => state.addMemory);
  const updateMemory = useSubbuStore((state) => state.updateMemory);
  const deleteMemory = useSubbuStore((state) => state.deleteMemory);

  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('user-preference');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewContent('');
  };

  const handleSaveNew = () => {
    if (!newContent.trim()) return;
    addMemory(newContent.trim(), 'Manual note', [newTag]);
    setNewContent('');
    setIsAdding(false);
  };

  const handleStartEdit = (id: string, currentContent: string) => {
    setEditingId(id);
    setEditContent(currentContent);
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    updateMemory(id, editContent.trim());
    setEditingId(null);
  };

  const handleConfirmDelete = (id: string) => {
    deleteMemory(id);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Search & Add Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-9 pr-3 py-1.5 bg-white/70 border border-white/90 rounded-xl text-xs font-sans text-ink-primary placeholder:text-ink-muted outline-hidden focus:border-sakura-300"
          />
        </div>
        <GlassButton size="sm" variant="secondary" onClick={handleStartAdd}>
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </GlassButton>
      </div>

      {/* Add Memory Form Panel */}
      {isAdding && (
        <div className="p-3 bg-sakura-50/80 border border-sakura-200/70 rounded-2xl flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-primary">Add Companion Memory</span>
            <button
              onClick={() => setIsAdding(false)}
              className="text-ink-muted hover:text-ink-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. User prefers Python for data scripts and dark mode in apps..."
            className="w-full p-2 bg-white/90 border border-white rounded-xl text-xs text-ink-primary resize-none h-16 outline-hidden focus:ring-1 focus:ring-sakura-400"
          />
          <div className="flex items-center justify-between gap-2">
            <select
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="text-[11px] bg-white/80 border border-sakura-200/60 rounded-lg px-2 py-1 text-ink-secondary outline-hidden"
            >
              <option value="user-preference">Preference</option>
              <option value="project-context">Project</option>
              <option value="personal">Personal</option>
              <option value="rule">Guideline</option>
            </select>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!newContent.trim()}
                className="px-3 py-1 bg-sakura-500 hover:bg-sakura-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Count */}
      <div className="flex items-center justify-between text-xs text-ink-muted font-medium">
        <span className="uppercase tracking-wider text-[10px]">
          Stored Memories ({filtered.length})
        </span>
        <span className="text-[10px] text-sakura-700 font-mono">Persisted Locally</span>
      </div>

      {/* Memories List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted bg-white/40 rounded-2xl border border-white/60 flex flex-col items-center justify-center">
            <Brain className="w-6 h-6 mb-2 text-ink-muted/50" />
            <span>No companion memories found.</span>
            <span className="text-[11px] text-ink-muted/70 mt-1">
              Add key preferences or facts so Subbu remembers them across sessions.
            </span>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-white/85 border border-white/95 rounded-2xl flex flex-col gap-2 shadow-2xs group transition-all"
            >
              {/* If editing this item */}
              {editingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 bg-white border border-sakura-300 rounded-xl text-xs text-ink-primary resize-none h-16 outline-hidden"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 text-xs text-ink-muted hover:text-ink-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="px-2.5 py-0.5 bg-sakura-500 hover:bg-sakura-600 text-white rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-sans text-ink-primary leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>
              )}

              {/* Tags / Metadata */}
              <div className="flex items-center gap-1 flex-wrap">
                {item.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-sakura-100/60 text-sakura-700"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Footer row with provenance & actions */}
              <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono pt-1 border-t border-sakura-100/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-sakura-500" />
                  {item.provenance || 'Conversation'}
                </span>

                <div className="flex items-center gap-1">
                  {editingId !== item.id && (
                    <button
                      onClick={() => handleStartEdit(item.id, item.content)}
                      title="Edit memory"
                      className="p-1 text-ink-muted hover:text-sakura-600 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}

                  {deletingId === item.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                      <span className="text-[10px] text-rose-700">Delete?</span>
                      <button
                        onClick={() => handleConfirmDelete(item.id)}
                        className="text-rose-700 font-bold hover:underline cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-ink-muted cursor-pointer ml-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(item.id)}
                      title="Forget memory"
                      className="p-1 text-ink-muted hover:text-rose-600 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
