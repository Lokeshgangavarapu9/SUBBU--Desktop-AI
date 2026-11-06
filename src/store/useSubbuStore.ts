import { create } from 'zustand';
import {
  OpenClawConnectionStatus,
  ChatMessage,
  ChatSession,
  ExecApprovalRequest,
  SpecialistAgent,
  MemoryItem,
  HelloOkPayload,
} from '../types/openclaw';
import {
  SubbuExpression,
  SubbuGesture,
  CameraFramingPreset,
  RenderQualityPreset,
} from '../types/character';
import { VoiceState, MicMode } from '../types/voice';
import { DesktopTask, WorkspaceFile } from '../types/tasks';
import { OllamaModel, BackendConfig } from '../types/backend';
import { SubbuBackendAdapter } from '../services/backend/SubbuBackendAdapter';

export type ActiveDrawer = 'chat' | 'voice' | 'tasks' | 'agents' | 'memory' | 'files' | 'settings' | null;

interface SubbuState {
  // Navigation & Spatial Layout
  activeDrawer: ActiveDrawer;
  setActiveDrawer: (drawer: ActiveDrawer) => void;
  stageOnlyMode: boolean;
  setStageOnlyMode: (enabled: boolean) => void;

  // Backend & Connection
  adapter: SubbuBackendAdapter;
  connectionStatus: OpenClawConnectionStatus;
  connectionDetail?: string;
  setConnectionStatus: (status: OpenClawConnectionStatus, detail?: string) => void;
  capabilities: HelloOkPayload | null;
  setCapabilities: (caps: HelloOkPayload | null) => void;
  backendConfig: BackendConfig;
  updateBackendConfig: (config: Partial<BackendConfig>) => void;

  // Chat Slice
  sessions: ChatSession[];
  activeSessionId: string;
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingText: string;
  activeThought: string | null;
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  updateLastMessage: (update: Partial<ChatMessage>) => void;
  deleteSession: (id: string) => void;
  clearSessionMessages: (sessionId: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setStreamingText: (text: string) => void;
  setActiveThought: (thought: string | null) => void;

  // Voice Slice
  voiceState: VoiceState;
  micMode: MicMode;
  audioFrequencyData: Uint8Array;
  audioRms: number;
  setVoiceState: (state: VoiceState) => void;
  setMicMode: (mode: MicMode) => void;
  setAudioTelemetry: (frequencyData: Uint8Array, rms: number) => void;

  // 3D Character Slice
  characterEnabled: boolean;
  modelUrl: string;
  expression: SubbuExpression;
  gesture: SubbuGesture | null;
  cameraPreset: CameraFramingPreset;
  qualityPreset: RenderQualityPreset;
  tactileReactionsEnabled: boolean;
  setCharacterEnabled: (enabled: boolean) => void;
  setModelUrl: (url: string) => void;
  setExpression: (expression: SubbuExpression) => void;
  setGesture: (gesture: SubbuGesture | null) => void;
  setCameraPreset: (preset: CameraFramingPreset) => void;
  setQualityPreset: (preset: RenderQualityPreset) => void;

  // Tasks & Approvals
  activeTasks: DesktopTask[];
  approvalRequests: ExecApprovalRequest[];
  setActiveTasks: (tasks: DesktopTask[]) => void;
  addApprovalRequest: (req: ExecApprovalRequest) => void;
  removeApprovalRequest: (id: string) => void;

  // Agents
  agents: SpecialistAgent[];
  activeAgentId: string;
  setAgents: (agents: SpecialistAgent[]) => void;
  setActiveAgentId: (id: string) => void;

  // Memory
  memories: MemoryItem[];
  setMemories: (memories: MemoryItem[]) => void;
  addMemory: (content: string, provenance?: string, tags?: string[]) => void;
  updateMemory: (id: string, content: string) => void;
  deleteMemory: (id: string) => void;

  // Files
  recentFiles: WorkspaceFile[];
  attachedFiles: File[];
  setRecentFiles: (files: WorkspaceFile[]) => void;
  attachFile: (file: File) => void;
  removeAttachedFile: (index: number) => void;
  clearAttachedFiles: () => void;

  // Ollama & Models
  installedModels: OllamaModel[];
  currentModelName: string;
  vramUsageBytes: number;
  isModelSelectorOpen: boolean;
  setInstalledModels: (models: OllamaModel[]) => void;
  setCurrentModelName: (name: string) => void;
  setVramUsageBytes: (bytes: number) => void;
  setModelSelectorOpen: (open: boolean) => void;

  // Performance & Accessibility
  reducedAnimation: boolean;
  reducedGpu: boolean;
  autoPauseOnMinimize: boolean;
  setReducedAnimation: (enabled: boolean) => void;
  setReducedGpu: (enabled: boolean) => void;
  setAutoPauseOnMinimize: (enabled: boolean) => void;

  // Timer Slice
  timerSeconds: number;
  timerTotal: number;
  isTimerRunning: boolean;
  timerMessage: string | null;
  startTimer: (seconds: number, label?: string) => void;
  stopTimer: () => void;
  tickTimer: () => void;

  // Developer / System Status Dashboard
  isStatusDashboardOpen: boolean;
  setStatusDashboardOpen: (open: boolean) => void;
}

const defaultBackendConfig: BackendConfig = {
  openclawWsUrl: 'ws://127.0.0.1:18789',
  openclawHttpUrl: 'http://127.0.0.1:18789',
  ollamaUrl: 'http://127.0.0.1:11434',
  authToken: '',
  simulationMode: false,
};

const loadSavedMemories = (): MemoryItem[] => {
  try {
    const raw = localStorage.getItem('subbu_companion_memories');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveMemoriesToStorage = (memories: MemoryItem[]) => {
  try {
    localStorage.setItem('subbu_companion_memories', JSON.stringify(memories));
  } catch {}
};

const loadSavedConfig = (): BackendConfig => {
  try {
    const raw = localStorage.getItem('subbu_backend_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultBackendConfig,
        openclawWsUrl: parsed.openclawWsUrl || defaultBackendConfig.openclawWsUrl,
        openclawHttpUrl: parsed.openclawHttpUrl || defaultBackendConfig.openclawHttpUrl,
        ollamaUrl: parsed.ollamaUrl || defaultBackendConfig.ollamaUrl,
        simulationMode: Boolean(parsed.simulationMode),
      };
    }
  } catch {}
  return defaultBackendConfig;
};

const initialConfig = loadSavedConfig();
const initialAdapter = new SubbuBackendAdapter(
  initialConfig.openclawWsUrl,
  initialConfig.openclawHttpUrl,
  initialConfig.ollamaUrl,
  initialConfig.authToken
);
initialAdapter.setSimulationMode(initialConfig.simulationMode);

export const useSubbuStore = create<SubbuState>((set, get) => ({
  // Navigation & Spatial Layout
  activeDrawer: null,
  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
  stageOnlyMode: false,
  setStageOnlyMode: (enabled) => set({ stageOnlyMode: enabled }),

  // Backend & Connection
  adapter: initialAdapter,
  connectionStatus: 'Disconnected',
  connectionDetail: undefined,
  setConnectionStatus: (status, detail) => set({ connectionStatus: status, connectionDetail: detail }),
  capabilities: null,
  setCapabilities: (caps) => set({ capabilities: caps }),
  backendConfig: initialConfig,
  updateBackendConfig: (configUpdate) => {
    const updated = { ...get().backendConfig, ...configUpdate };
    get().adapter.updateConfig(
      updated.openclawWsUrl,
      updated.openclawHttpUrl,
      updated.ollamaUrl,
      updated.authToken
    );
    get().adapter.setSimulationMode(updated.simulationMode);
    try {
      localStorage.setItem('subbu_backend_config', JSON.stringify({
        openclawWsUrl: updated.openclawWsUrl,
        openclawHttpUrl: updated.openclawHttpUrl,
        ollamaUrl: updated.ollamaUrl,
        simulationMode: updated.simulationMode,
      }));
    } catch {}
    set({ backendConfig: updated });
  },

  // Chat Slice
  sessions: [
    {
      id: 'default-session',
      title: 'General Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  activeSessionId: 'default-session',
  messages: [
    {
      id: 'welcome-msg',
      sessionId: 'default-session',
      role: 'assistant',
      content: "Hello! I am Subbu, your personal AI desktop companion. How can I help you today?",
      timestamp: Date.now(),
      emotion: 'smiling',
    },
  ],
  isGenerating: false,
  streamingText: '',
  activeThought: null,
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, sessionId: msg.sessionId || state.activeSessionId },
      ],
    })),
  updateMessage: (id, update) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
    })),
  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  updateLastMessage: (update) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          ...update,
        };
      }
      return { messages };
    }),
  deleteSession: (id) =>
    set((state) => {
      const remainingSessions = state.sessions.filter((s) => s.id !== id);
      const newActiveId =
        state.activeSessionId === id
          ? remainingSessions[0]?.id || `session-${Date.now()}`
          : state.activeSessionId;

      const finalSessions =
        remainingSessions.length > 0
          ? remainingSessions
          : [
              {
                id: newActiveId,
                title: 'General Chat',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ];

      return {
        sessions: finalSessions,
        activeSessionId: newActiveId,
        messages: state.messages.filter((m) => m.sessionId !== id),
      };
    }),
  clearSessionMessages: (sessionId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.sessionId !== sessionId),
    })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setStreamingText: (streamingText) => set({ streamingText }),
  setActiveThought: (activeThought) => set({ activeThought }),

  // Voice Slice
  voiceState: 'idle',
  micMode: 'dictation',
  audioFrequencyData: new Uint8Array(32),
  audioRms: 0,
  setVoiceState: (voiceState) => set({ voiceState }),
  setMicMode: (micMode) => set({ micMode }),
  setAudioTelemetry: (frequencyData, rms) =>
    set({ audioFrequencyData: frequencyData, audioRms: rms }),

  // Ambient Companion Stage Slice
  characterEnabled: false,
  modelUrl: '',
  expression: 'neutral',
  gesture: null,
  cameraPreset: 'upper',
  qualityPreset: 'balanced',
  tactileReactionsEnabled: false,
  setCharacterEnabled: (characterEnabled) => set({ characterEnabled }),
  setModelUrl: (modelUrl) => set({ modelUrl }),
  setExpression: (expression) => set({ expression }),
  setGesture: (gesture) => set({ gesture }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setQualityPreset: (qualityPreset) => set({ qualityPreset }),

  // Tasks & Approvals
  activeTasks: [],
  approvalRequests: [],
  setActiveTasks: (activeTasks) => set({ activeTasks }),
  addApprovalRequest: (req) =>
    set((state) => ({ approvalRequests: [...state.approvalRequests, req] })),
  removeApprovalRequest: (id) =>
    set((state) => ({
      approvalRequests: state.approvalRequests.filter((r) => r.id !== id),
    })),

  // Agents
  agents: [
    {
      id: 'main',
      name: 'Subbu (Core)',
      description: 'Your primary personal AI companion for general conversations and Windows desktop tasks.',
      status: 'active',
      capabilities: ['desktop', 'voice', 'files', 'browser'],
    },
    {
      id: 'coder',
      name: 'Code Specialist',
      description: 'Expert in software development, algorithm design, debugging, and terminal commands.',
      status: 'idle',
      capabilities: ['code', 'debugging', 'git', 'terminal'],
    },
    {
      id: 'researcher',
      name: 'Research Specialist',
      description: 'Specialized in deep document reasoning, objective synthesis, and fact extraction.',
      status: 'idle',
      capabilities: ['research', 'analysis', 'documents', 'reasoning'],
    },
  ],
  activeAgentId: 'main',
  setAgents: (agents) => set({ agents }),
  setActiveAgentId: (activeAgentId) => set({ activeAgentId }),

  // Memory
  memories: loadSavedMemories(),
  setMemories: (memories) => {
    saveMemoriesToStorage(memories);
    set({ memories });
  },
  addMemory: (content, provenance = 'User manual entry', tags = []) => {
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      content: content.trim(),
      provenance,
      timestamp: Date.now(),
      tags,
    };
    const updated = [newMem, ...get().memories];
    saveMemoriesToStorage(updated);
    set({ memories: updated });
  },
  updateMemory: (id, content) => {
    const updated = get().memories.map((m) =>
      m.id === id ? { ...m, content: content.trim(), timestamp: Date.now() } : m
    );
    saveMemoriesToStorage(updated);
    set({ memories: updated });
  },
  deleteMemory: (id) => {
    const updated = get().memories.filter((m) => m.id !== id);
    saveMemoriesToStorage(updated);
    set({ memories: updated });
  },

  // Files
  recentFiles: [],
  attachedFiles: [],
  setRecentFiles: (recentFiles) => set({ recentFiles }),
  attachFile: (file) =>
    set((state) => ({ attachedFiles: [...state.attachedFiles, file] })),
  removeAttachedFile: (index) =>
    set((state) => ({
      attachedFiles: state.attachedFiles.filter((_, i) => i !== index),
    })),
  clearAttachedFiles: () => set({ attachedFiles: [] }),

  // Ollama & Models
  installedModels: [],
  currentModelName: 'qwen3.5:2b-q4_K_M',
  vramUsageBytes: 0,
  isModelSelectorOpen: false,
  setInstalledModels: (installedModels) => set({ installedModels }),
  setCurrentModelName: (currentModelName) => {
    try {
      localStorage.setItem('subbu_active_model', currentModelName);
    } catch {}
    set({ currentModelName });
  },
  setVramUsageBytes: (vramUsageBytes) => set({ vramUsageBytes }),
  setModelSelectorOpen: (isModelSelectorOpen) => set({ isModelSelectorOpen }),

  // Performance & Accessibility
  reducedAnimation: false,
  reducedGpu: false,
  autoPauseOnMinimize: true,
  setReducedAnimation: (reducedAnimation) => set({ reducedAnimation }),
  setReducedGpu: (reducedGpu) => set({ reducedGpu }),
  setAutoPauseOnMinimize: (autoPauseOnMinimize) => set({ autoPauseOnMinimize }),

  // Timer Slice
  timerSeconds: 0,
  timerTotal: 0,
  isTimerRunning: false,
  timerMessage: null,
  startTimer: (seconds, label = '1-Minute Timer') => {
    set({
      timerSeconds: seconds,
      timerTotal: seconds,
      isTimerRunning: true,
      timerMessage: label,
    });
  },
  stopTimer: () => set({ isTimerRunning: false, timerSeconds: 0, timerMessage: null }),
  tickTimer: () => {
    const current = get().timerSeconds;
    if (current <= 1) {
      set({
        timerSeconds: 0,
        isTimerRunning: false,
        timerMessage: 'Timer Completed! 🎉',
      });
    } else {
      set({ timerSeconds: current - 1 });
    }
  },

  // Developer / System Status Dashboard
  isStatusDashboardOpen: false,
  setStatusDashboardOpen: (isStatusDashboardOpen) => set({ isStatusDashboardOpen }),
}));

