import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Check,
  RefreshCw,
  X,
  HardDrive,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassPanel } from '../ui/GlassPanel';
import { GlassButton } from '../ui/GlassButton';
import { OllamaClient } from '../../services/ollama/ollamaClient';
import type { OllamaModel } from '../../types/backend';

export const ModelSelectorModal: React.FC = () => {
  const isModelSelectorOpen = useSubbuStore((state) => state.isModelSelectorOpen);
  const setModelSelectorOpen = useSubbuStore((state) => state.setModelSelectorOpen);
  const currentModelName = useSubbuStore((state) => state.currentModelName);
  const setCurrentModelName = useSubbuStore((state) => state.setCurrentModelName);
  const backendConfig = useSubbuStore((state) => state.backendConfig);

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new OllamaClient(backendConfig.ollamaUrl);
      const list = await client.getTags();
      setModels(list);
    } catch (err: any) {
      console.error('Failed to load Ollama models:', err);
      setError(
        `Unable to fetch models from Ollama (${backendConfig.ollamaUrl}). Ensure Ollama service is running.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModelSelectorOpen) {
      fetchModels();
    }
  }, [isModelSelectorOpen, backendConfig.ollamaUrl]);

  if (!isModelSelectorOpen) return null;

  const handleSelectModel = (name: string) => {
    setCurrentModelName(name);
    setModelSelectorOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModel.trim()) return;
    setCurrentModelName(customModel.trim());
    setModelSelectorOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/20 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg"
        >
          <GlassPanel elevated className="p-5 rounded-3xl shadow-glass flex flex-col gap-4 border border-white/90">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sakura-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sakura-100/70 text-sakura-600">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-primary">Select Active LLM Model</h3>
                  <p className="text-xs text-ink-muted">Choose from installed local Ollama models</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchModels}
                  disabled={loading}
                  title="Refresh models"
                  className="p-1.5 rounded-xl hover:bg-sakura-100 text-ink-muted hover:text-sakura-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setModelSelectorOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-sakura-100 text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Models List */}
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {loading && models.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sakura-500" />
                  <span>Loading local models from Ollama...</span>
                </div>
              ) : models.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted bg-sakura-50/40 rounded-2xl border border-sakura-100">
                  <p className="font-semibold text-ink-secondary mb-1">No installed models found.</p>
                  <p>Run `ollama pull qwen3.5:2b-q4_K_M` in your terminal to install an efficient model.</p>
                </div>
              ) : (
                models.map((m) => {
                  const isSelected = m.name === currentModelName;
                  const sizeGb = (m.size / (1024 * 1024 * 1024)).toFixed(2);
                  return (
                    <button
                      key={m.name}
                      onClick={() => handleSelectModel(m.name)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-sakura-100/70 border-sakura-400/80 shadow-xs ring-1 ring-sakura-300'
                          : 'bg-white/70 hover:bg-white border-white/90 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm text-ink-primary">
                            {m.name}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sakura-500 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-ink-muted font-mono">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-sakura-500" />
                            {sizeGb} GB
                          </span>
                          {m.details?.parameter_size && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-sakura-500" />
                              {m.details.parameter_size}
                            </span>
                          )}
                          {m.details?.quantization_level && (
                            <span className="text-ink-secondary">
                              {m.details.quantization_level}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-sakura-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-sakura-200 bg-white/60 flex items-center justify-center shrink-0 text-ink-muted hover:border-sakura-400">
                          <Sparkles className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Custom Model Name Input */}
            <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-sakura-100 flex items-center gap-2">
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Or specify custom model name (e.g. llama3.2:1b)..."
                className="flex-1 px-3 py-1.5 bg-white/70 border border-sakura-200/60 rounded-xl text-xs font-mono text-ink-primary placeholder:text-ink-muted outline-hidden focus:border-sakura-400"
              />
              <GlassButton size="sm" variant="secondary" disabled={!customModel.trim()}>
                Apply
              </GlassButton>
            </form>
          </GlassPanel>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

