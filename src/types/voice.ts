/**
 * Voice & Audio State Types
 */

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type MicMode = 'dictation' | 'ptt' | 'continuous';

export interface VoiceSettings {
  mode: MicMode;
  inputDeviceId: string;
  ttsProvider: 'openclaw' | 'browser' | 'piper';
  volume: number;
  rate: number;
  pitch: number;
  vadBargeInEnabled: boolean;
}

export interface AudioVisualizerData {
  frequencyData: Uint8Array;
  rms: number;
  peak: number;
}

