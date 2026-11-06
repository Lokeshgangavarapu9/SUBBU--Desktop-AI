import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  FileCode,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';

export const FilesDrawer: React.FC = () => {
  const attachFile = useSubbuStore((state) => state.attachFile);
  const attachedFiles = useSubbuStore((state) => state.attachedFiles);
  const clearAttachedFiles = useSubbuStore((state) => state.clearAttachedFiles);
  const setAttachedFiles = (files: File[]) => {
    // Replace attached files in store
    useSubbuStore.setState({ attachedFiles: files });
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => processFile(file));
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    const isImage = file.type.startsWith('image/');
    const maxBytes = isImage ? 6 * 1024 * 1024 : 20 * 1024 * 1024;

    if (file.size > maxBytes) {
      setErrorMsg(
        `"${file.name}" exceeds maximum permitted size (${isImage ? '6MB for images' : '20MB for documents'}).`
      );
      return;
    }

    attachFile(file);
  };

  const handleRemoveFile = (index: number) => {
    const updated = attachedFiles.filter((_, i) => i !== index);
    setAttachedFiles(updated);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'html', 'css', 'toml', 'yaml', 'yml'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-sakura-600 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-sakura-600 shrink-0" />;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="p-6 border-2 border-dashed border-sakura-300 rounded-3xl bg-sakura-50/50 hover:bg-sakura-100/50 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer relative group"
      >
        <input
          type="file"
          multiple
          onChange={handleSelect}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <UploadCloud className="w-8 h-8 text-sakura-600 group-hover:scale-105 transition-transform" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-ink-primary">
            Drop workspace files here or browse
          </span>
          <span className="text-[10px] text-ink-muted">
            Code, text, docs (max 20MB) or Images (max 6MB)
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-status-errorBg border border-rose-200 text-status-errorText text-xs rounded-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Currently Attached Files */}
      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Active Attachments ({attachedFiles.length})
          </span>
          {attachedFiles.length > 0 && (
            <button
              onClick={clearAttachedFiles}
              className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {attachedFiles.length === 0 ? (
            <div className="p-6 text-center text-xs text-ink-muted bg-white/40 rounded-2xl border border-white/60">
              No files currently attached. Attached text files will automatically be read and provided to Subbu as context with your next prompt.
            </div>
          ) : (
            attachedFiles.map((f, i) => (
              <div
                key={i}
                className="p-3 bg-white/80 border border-white/95 rounded-2xl flex items-center justify-between shadow-2xs group hover:bg-white transition-all"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {getFileIcon(f)}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-sans font-medium text-ink-primary truncate">
                      {f.name}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted">
                      {(f.size / 1024).toFixed(1)} KB • {f.type || 'plain text'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <button
                    onClick={() => handleRemoveFile(i)}
                    title="Remove file"
                    className="p-1 text-ink-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
