/**
 * OpenClaw Gateway Protocol v4 Type Definitions
 * Based on official OpenClaw specification: https://docs.openclaw.ai/gateway/protocol
 */

export type OpenClawConnectionStatus =
  | 'Connected'
  | 'Connecting'
  | 'Disconnected'
  | 'Authentication Required'
  | 'Backend Error';

export type OpenClawFrameType = 'req' | 'res' | 'event';

// Protocol v4 Request Frame
export interface OpenClawReqFrame<T = unknown> {
  type: 'req';
  id: string;
  method: string;
  params?: T;
}

// Protocol v4 Response Frame
export interface OpenClawResFrame<T = unknown> {
  type: 'res';
  id: string;
  ok: boolean;
  result?: T;
  payload?: T;
  error?: {
    code: number | string;
    message: string;
    data?: unknown;
  };
}

// Protocol v4 Server-Pushed Event Frame
export interface OpenClawEventFrame<T = unknown> {
  type: 'event';
  event: string;
  payload: T;
  seq?: number;
}

export type OpenClawFrame =
  | OpenClawReqFrame
  | OpenClawResFrame
  | OpenClawEventFrame;

// Handshake Challenge Payload (connect.challenge event)
export interface ConnectChallengePayload {
  nonce: string;
  ts: number;
}

// Connect Request Params
export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  role: 'operator' | 'agent' | 'node';
  scopes: string[];
  caps: string[];
  auth?: {
    token?: string;
  };
  client: {
    id: string;
    version: string;
    platform?: string;
    mode?: string;
  };
}

// Hello-OK Response Payload
export interface HelloOkPayload {
  type: 'hello-ok';
  protocol: number;
  server: {
    name: string;
    version: string;
  };
  features?: {
    methods?: string[];
    events?: string[];
  };
  policy?: {
    tickIntervalMs?: number;
    attachments?: {
      maxBytes?: number;
      maxImageBytes?: number;
    };
  };
}

// Chat Session and Message Types
export interface ChatMessage {
  id: string;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  emotion?: string;
  thought?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args?: Record<string, unknown>;
    result?: unknown;
    status: 'running' | 'completed' | 'failed';
  }>;
  streaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  agentId?: string;
}

// Exec Approval Types
export interface ExecApprovalRequest {
  id: string;
  command: string;
  cwd?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  requestedAt: number;
}

export interface ExecApprovalResolution {
  id: string;
  approved: boolean;
  reason?: string;
}

// Specialist Agent Definition
export interface SpecialistAgent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'active' | 'busy';
  capabilities: string[];
  avatarUrl?: string;
}

// Memory Item
export interface MemoryItem {
  id: string;
  content: string;
  provenance?: string;
  timestamp: number;
  tags?: string[];
}

