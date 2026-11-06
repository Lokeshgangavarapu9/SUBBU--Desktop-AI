/**
 * Local Backend & Telemetry Types (OpenClaw + Ollama)
 */

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export interface OllamaRunningProcess {
  name: string;
  model: string;
  size_vram: number;
  size: number;
  expires_at: string;
}

export interface BackendConfig {
  openclawWsUrl: string;
  openclawHttpUrl: string;
  ollamaUrl: string;
  authToken: string;
  simulationMode: boolean;
}

