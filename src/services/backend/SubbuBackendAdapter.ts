import { OpenClawSocketClient } from '../openclaw/socketClient';
import { OpenClawHttpClient } from '../openclaw/httpClient';
import { OllamaClient } from '../ollama/ollamaClient';
import { VoiceManager } from '../audio/voiceManager';
import {
  OpenClawConnectionStatus,
  ChatMessage,
  ChatSession,
  ExecApprovalRequest,
  SpecialistAgent,
  MemoryItem,
} from '../../types/openclaw';
import { OllamaModel, OllamaRunningProcess } from '../../types/backend';
import { DesktopTask, WorkspaceFile } from '../../types/tasks';
import { extractThoughtBlocks, parseEmotionTag } from '../../utils/emotionParser';
import { AgentDesktopManager, AgentDesktopEvents } from '../../integrations/agent-desktop';

export class SubbuBackendAdapter {
  private socket: OpenClawSocketClient;
  private http: OpenClawHttpClient;
  private ollama: OllamaClient;
  public voice: VoiceManager;
  public desktop: AgentDesktopManager;
  private simulationMode = false;
  private simTimer: NodeJS.Timeout | null = null;
  private currentAbortController: AbortController | null = null;

  constructor(
    wsUrl = 'ws://127.0.0.1:18789',
    httpUrl = 'http://127.0.0.1:18789',
    ollamaUrl = 'http://127.0.0.1:11434',
    authToken = ''
  ) {
    this.socket = new OpenClawSocketClient(wsUrl, authToken);
    this.http = new OpenClawHttpClient(httpUrl, authToken);
    this.ollama = new OllamaClient(ollamaUrl);
    this.voice = new VoiceManager();
    this.desktop = AgentDesktopManager.getInstance();
  }

  public setSimulationMode(enabled: boolean) {
    this.simulationMode = enabled;
  }

  public isSimulationMode(): boolean {
    return this.simulationMode;
  }

  public updateConfig(wsUrl: string, httpUrl: string, ollamaUrl: string, authToken: string) {
    this.socket.setUrl(wsUrl);
    this.socket.setAuthToken(authToken);
    this.http.setBaseUrl(httpUrl);
    this.http.setAuthToken(authToken);
    this.ollama.setBaseUrl(ollamaUrl);
  }

  public connect(): void {
    if (!this.simulationMode) {
      this.socket.connect();
    }
  }

  public disconnect(): void {
    this.socket.disconnect();
    this.voice.stopListening();
    this.voice.stopSpeaking();
  }

  public onStatusChange(cb: (status: OpenClawConnectionStatus, detail?: string) => void) {
    return this.socket.onStatusChange(cb);
  }

  public onEvent(cb: (event: string, payload: any) => void) {
    return this.socket.onEvent(cb);
  }

  // --- Chat Operations ---
  public async getSessions(): Promise<ChatSession[]> {
    if (this.simulationMode) {
      return [
        {
          id: 'sim-session-1',
          title: 'Welcome to SUBBU Preview',
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now(),
        },
      ];
    }
    try {
      const res = await this.socket.request<any>('sessions.list');
      if (Array.isArray(res?.sessions)) {
        return res.sessions.map((s: any) => ({
          id: s.id || s.sessionId,
          title: s.title || s.name || 'Conversation',
          createdAt: s.createdAt || Date.now(),
          updatedAt: s.updatedAt || Date.now(),
          agentId: s.agentId,
        }));
      }
      return [];
    } catch (e) {
      console.warn('[Adapter] sessions.list fallback:', e);
      return [];
    }
  }

  public async sendMessage(
    text: string,
    sessionId: string,
    onDelta: (delta: string, fullText: string, emotion?: string, thought?: string) => void,
    onComplete: (fullText: string, emotion?: string) => void,
    onError: (err: any) => void,
    options?: {
      model?: string;
      agentId?: string;
      history?: ChatMessage[];
      fileContext?: string;
    }
  ): Promise<void> {
    // Abort previous generation if any
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();
    const currentSignal = this.currentAbortController.signal;

    if (this.simulationMode) {
      // High-fidelity Preview Simulation
      const simResponses = [
        "[happy] Hello! I am Subbu, your personal AI desktop companion! In this preview simulation mode, you can test all my facial expressions, hand gestures, voice synthesis, and desktop workflows.",
        "[thinking] <think>Checking local system status and available tools...</think> Everything is running smoothly! On your Windows 11 machine, I connect directly to OpenClaw at 127.0.0.1:18789.",
        "[curious] Would you like me to demonstrate an application launch, inspect your active tasks, or test a voice conversation?",
        "[smiling] I'm right here with you! Feel free to switch between my 3D character stage and the ambient pearl aura.",
      ];
      const reply = simResponses[Math.floor(Math.random() * simResponses.length)];
      let index = 0;
      let accumulated = '';

      this.simTimer = setInterval(() => {
        if (currentSignal.aborted) {
          if (this.simTimer) clearInterval(this.simTimer);
          return;
        }
        if (index < reply.length) {
          const chunk = reply.slice(index, index + 3);
          index += 3;
          accumulated += chunk;

          const { display, thoughts } = extractThoughtBlocks(accumulated);
          const { emotion, cleanText } = parseEmotionTag(display);
          onDelta(chunk, cleanText, emotion || undefined, thoughts[0]);
        } else {
          if (this.simTimer) clearInterval(this.simTimer);
          const { display } = extractThoughtBlocks(accumulated);
          const { emotion, cleanText } = parseEmotionTag(display);
          onComplete(cleanText, emotion || undefined);
        }
      }, 40);
      return;
    }

    // Quick Desktop Intent check for immediate native desktop actions
    const lowerText = text.trim().toLowerCase();
    const isLaunchNotepad = /open\s+(notepad|editor)|launch\s+notepad/.test(lowerText);
    const isLaunchCalc = /open\s+(calc|calculator)|launch\s+calculator/.test(lowerText);
    const isLaunchBrowser = /open\s+(browser|chrome|edge)|launch\s+browser/.test(lowerText);
    const isLaunchCalendar = /open\s+calendar|launch\s+calendar/.test(lowerText);

    if (isLaunchNotepad || isLaunchCalc || isLaunchBrowser || isLaunchCalendar) {
      let appTarget = 'notepad';
      if (isLaunchCalc) appTarget = 'calc';
      else if (isLaunchBrowser) appTarget = 'browser';
      else if (isLaunchCalendar) appTarget = 'calendar';

      try {
        const invoker = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke;
        if (invoker) {
          const res = await invoker('open_application', { appName: appTarget });
          const confirmMsg = `[happy] I've launched ${appTarget.toUpperCase()} on your Windows desktop for you! (${res})`;
          onDelta(confirmMsg, confirmMsg, 'happy');
          onComplete(confirmMsg, 'happy');
          return;
        }
      } catch (err: any) {
        console.warn('[Adapter] Failed desktop launch:', err);
      }
    }

    // Multi-turn message structure with specialist agent persona
    let systemPrompt = 'You are Subbu, a delightful, intelligent, and warm personal AI desktop companion on Windows 11. Answer clearly, provide concise explanations, maintain a friendly persona, and help with desktop tasks.';
    if (options?.agentId === 'coder') {
      systemPrompt = 'You are Subbu Code Specialist, an expert software developer and debugger on Windows 11. Provide precise, production-ready code snippets. Format code blocks with syntax highlighting. Explain key design decisions concisely.';
    } else if (options?.agentId === 'researcher') {
      systemPrompt = 'You are Subbu Research Specialist, an analytical research intelligence companion on Windows 11. Synthesize information objectively, extract structured data, analyze documents carefully, and cite factual conclusions clearly.';
    }

    const messagesPayload: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Append prior conversational history
    if (options?.history && options.history.length > 0) {
      const priorTurns = options.history
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content && m.content.trim().length > 0 && !m.streaming)
        .slice(-8)
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));
      messagesPayload.push(...priorTurns);
    }

    // Append user input with file context if present
    const userContent = options?.fileContext
      ? `[Attached Workspace Files Context]:\n${options.fileContext}\n\n[User Message]:\n${text}`
      : text;
    messagesPayload.push({ role: 'user', content: userContent });

    // Direct High-Performance Local Ollama Multi-Turn Streaming
    try {
      let accumulated = '';
      await this.ollama.streamChat(
        {
          model: options?.model || 'qwen3.5:2b-q4_K_M',
          messages: messagesPayload,
          keep_alive: '30m',
          think: false,
          options: {
            num_ctx: 2048,
            num_predict: 512,
            temperature: options?.agentId === 'coder' ? 0.3 : 0.7,
            top_p: 0.9,
          },
        },
        (chunk, thinking) => {
          accumulated += chunk;
          const { display, thoughts } = extractThoughtBlocks(accumulated);
          const { emotion, cleanText } = parseEmotionTag(display);
          onDelta(chunk, cleanText, emotion || undefined, thinking || thoughts[0]);
        },
        (fullText) => {
          const { display } = extractThoughtBlocks(fullText);
          const { emotion, cleanText } = parseEmotionTag(display);
          onComplete(cleanText, emotion || undefined);
        },
        (err) => {
          onError(err);
        },
        currentSignal
      );
    } catch (err) {
      onError(err);
    }
  }

  public async abortChat(sessionId?: string): Promise<void> {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    if (this.simulationMode && this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
      return;
    }
    try {
      await this.socket.request('chat.abort', { sessionId });
      await this.socket.request('talk.session.cancelOutput', {});
    } catch (e) {
      // ignore
    }
  }

  // --- Task & Approval Operations ---
  public async resolveApproval(id: string, approved: boolean, reason?: string): Promise<void> {
    if (this.simulationMode) {
      return;
    }
    await this.socket.request('exec.approval.resolve', {
      id,
      approved,
      reason,
    });
  }

  // --- Model & Telemetry Operations ---
  public async getOllamaModels(): Promise<OllamaModel[]> {
    if (this.simulationMode) {
      return [
        {
          name: 'qwen3.5:2b-q4_K_M',
          size: 1945781358,
          digest: '1e2d21a4f03a',
          modified_at: new Date().toISOString(),
          details: { parameter_size: '1.9B', quantization_level: 'Q4_K_M', family: 'qwen35' },
        },
      ];
    }
    return await this.ollama.getTags();
  }

  public async getOllamaVramUsage(): Promise<{ loaded: OllamaRunningProcess[]; totalVramBytes: number }> {
    if (this.simulationMode) {
      return {
        loaded: [
          {
            name: 'qwen3.5:2b-q4_K_M',
            model: 'qwen3.5:2b-q4_K_M',
            size_vram: 1720000000, // ~1.6 GB
            size: 1945781358,
            expires_at: new Date(Date.now() + 300000).toISOString(),
          },
        ],
        totalVramBytes: 1720000000,
      };
    }
    const processes = await this.ollama.getRunningProcesses();
    const total = processes.reduce((acc, p) => acc + (p.size_vram || 0), 0);
    return { loaded: processes, totalVramBytes: total };
  }
}

