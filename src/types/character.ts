/**
 * Subbu Companion Stage, Presence & Expression Types
 */

export type SubbuExpression =
  | 'neutral'
  | 'smiling'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'thinking'
  | 'confused'
  | 'sad'
  | 'surprised'
  | 'sleepy'
  | 'listening';

export type SubbuGesture =
  | 'wave'
  | 'greeting'
  | 'happy'
  | 'thinking'
  | 'pointing'
  | 'listening'
  | 'celebrating'
  | 'shy'
  | 'goodbye'
  | 'conversational';

export type CameraFramingPreset = 'upper' | 'closeup' | 'full';

export type RenderQualityPreset = 'balanced' | 'eco' | 'high';

export interface CompanionStageState {
  expression: SubbuExpression;
  gesture: SubbuGesture | null;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  qualityPreset: RenderQualityPreset;
  reducedAnimation: boolean;
}
