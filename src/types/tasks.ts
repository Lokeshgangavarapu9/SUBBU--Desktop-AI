/**
 * Task, Desktop Control & Tool Types
 */

export interface DesktopTask {
  id: string;
  title: string;
  status: 'running' | 'completed' | 'failed' | 'waiting_approval';
  agentId?: string;
  currentOperation?: string;
  progressPercent?: number;
  toolEvents: Array<{
    id: string;
    toolName: string;
    status: 'running' | 'success' | 'error';
    summary?: string;
    timestamp: number;
  }>;
  snapshotUrl?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface CronSchedule {
  id: string;
  name: string;
  expression: string;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
  type: string;
}

