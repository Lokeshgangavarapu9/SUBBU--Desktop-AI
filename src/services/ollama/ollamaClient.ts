import { OllamaModel, OllamaRunningProcess } from '../../types/backend';

export interface OllamaGenerateOptions {
  model?: string;
  system?: string;
  prompt: string;
  stream?: boolean;
  think?: boolean;
  options?: {
    num_ctx?: number;
    num_predict?: number;
    temperature?: number;
    top_p?: number;
  };
  keep_alive?: string;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  think?: boolean;
  options?: {
    num_ctx?: number;
    num_predict?: number;
    temperature?: number;
    top_p?: number;
  };
  keep_alive?: string;
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public async getTags(signal?: AbortSignal): Promise<OllamaModel[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama /api/tags returned HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.models || [];
    } catch (err: any) {
      console.warn('[OllamaClient] Failed to fetch /api/tags:', err.message);
      return [];
    }
  }

  public async getRunningProcesses(signal?: AbortSignal): Promise<OllamaRunningProcess[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`, {
        method: 'GET',
        signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama /api/ps returned HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.models || [];
    } catch (err: any) {
      console.warn('[OllamaClient] Failed to fetch /api/ps:', err.message);
      return [];
    }
  }

  /**
   * High-Performance Direct Streaming from local Ollama GPU runner.
   * Keeps model warm in VRAM (30m keep-alive) and tunes context length to 2048 for 4GB VRAM.
   */
  public async streamGenerate(
    opts: OllamaGenerateOptions,
    onChunk: (text: string, thinking?: string) => void,
    onComplete: (fullText: string, evalStats?: { tokens: number; tokensPerSec: number }) => void,
    onError: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const model = opts.model || 'qwen3.5:2b-q4_K_M';
    const body: any = {
      model,
      system: opts.system || 'You are Subbu, a friendly and helpful personal AI desktop companion on Windows 11. Answer concisely and warmly.',
      prompt: opts.prompt,
      stream: true,
      keep_alive: opts.keep_alive || '30m',
      think: opts.think ?? false,
      options: {
        num_ctx: opts.options?.num_ctx || 2048,
        num_predict: opts.options?.num_predict || 512,
        temperature: opts.options?.temperature || 0.7,
        top_p: opts.options?.top_p || 0.9,
      },
    };

    let fullText = '';
    let currentThinking = '';
    let inThinkTag = false;

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by runtime');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const token = data.response || '';
            const thinkToken = data.thinking || '';

            if (thinkToken) {
              currentThinking += thinkToken;
              onChunk('', currentThinking);
            }

            if (token) {
              if (token.includes('<think>')) inThinkTag = true;
              if (token.includes('</think>')) {
                inThinkTag = false;
                continue;
              }

              if (!inThinkTag) {
                fullText += token;
                onChunk(token, currentThinking || undefined);
              } else {
                currentThinking += token;
                onChunk('', currentThinking);
              }
            }

            if (data.done) {
              const tokensPerSec = data.eval_duration
                ? parseFloat((data.eval_count / (data.eval_duration / 1e9)).toFixed(1))
                : 0;
              onComplete(fullText, {
                tokens: data.eval_count || 0,
                tokensPerSec,
              });
              return;
            }
          } catch (_) {
            // ignore non-json fragments
          }
        }
      }

      onComplete(fullText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[OllamaClient] Stream aborted by caller.');
        return;
      }
      onError(err);
    }
  }

  /**
   * High-Performance Multi-Turn Streaming Chat using local Ollama GPU runner (/api/chat).
   */
  public async streamChat(
    opts: OllamaChatOptions,
    onChunk: (text: string, thinking?: string) => void,
    onComplete: (fullText: string, evalStats?: { tokens: number; tokensPerSec: number }) => void,
    onError: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const model = opts.model || 'qwen3.5:2b-q4_K_M';
    const body: any = {
      model,
      messages: opts.messages,
      stream: true,
      keep_alive: opts.keep_alive || '30m',
      think: opts.think ?? false,
      options: {
        num_ctx: opts.options?.num_ctx || 2048,
        num_predict: opts.options?.num_predict || 512,
        temperature: opts.options?.temperature || 0.7,
        top_p: opts.options?.top_p || 0.9,
      },
    };

    let fullText = '';
    let currentThinking = '';
    let inThinkTag = false;

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama /api/chat returned status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by runtime');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const token = data.message?.content || data.response || '';
            const thinkToken = data.thinking || '';

            if (thinkToken) {
              currentThinking += thinkToken;
              onChunk('', currentThinking);
            }

            if (token) {
              if (token.includes('<think>')) inThinkTag = true;
              if (token.includes('</think>')) {
                inThinkTag = false;
                continue;
              }

              if (!inThinkTag) {
                fullText += token;
                onChunk(token, currentThinking || undefined);
              } else {
                currentThinking += token;
                onChunk('', currentThinking);
              }
            }

            if (data.done) {
              const tokensPerSec = data.eval_duration
                ? parseFloat((data.eval_count / (data.eval_duration / 1e9)).toFixed(1))
                : 0;
              onComplete(fullText, {
                tokens: data.eval_count || 0,
                tokensPerSec,
              });
              return;
            }
          } catch (_) {
            // ignore non-json fragments
          }
        }
      }

      onComplete(fullText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[OllamaClient] Chat stream aborted by caller.');
        return;
      }
      onError(err);
    }
  }
}

