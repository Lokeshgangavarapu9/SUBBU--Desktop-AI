/**
 * AgentDesktopTypes.ts
 * Type definitions for SUBBU's Vercel Agent Desktop integration layer.
 */

export type DesktopActionType =
  | 'list-apps'
  | 'list-windows'
  | 'list-displays'
  | 'snapshot'
  | 'find'
  | 'get'
  | 'is'
  | 'click'
  | 'double-click'
  | 'triple-click'
  | 'right-click'
  | 'type'
  | 'set-value'
  | 'clear'
  | 'focus'
  | 'press'
  | 'scroll'
  | 'launch'
  | 'close-app'
  | 'focus-window'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'clipboard-get'
  | 'clipboard-set'
  | 'status'
  | 'permissions';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AppInfo {
  name: string;
  window_count?: number;
  pid?: number;
  main_window_title?: string;
  is_active?: boolean;
}

export interface WindowInfo {
  id: string;
  title: string;
  app_name: string;
  pid: number;
  is_minimized?: boolean;
  is_maximized?: boolean;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DisplayInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  scale_factor: number;
  is_primary: boolean;
}

export interface UIElementNode {
  ref: string;
  role: string;
  name?: string;
  value?: string;
  is_interactive?: boolean;
  is_focused?: boolean;
  is_disabled?: boolean;
  children?: UIElementNode[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface UISnapshot {
  snapshot_id: string;
  app: string;
  timestamp: number;
  window_title?: string;
  root: UIElementNode;
  interactive_refs_count: number;
  raw_json?: any;
}

export interface SnapshotOptions {
  app?: string;
  window_id?: string;
  interactive_only?: boolean;
  skeleton?: boolean;
  compact?: boolean;
  depth?: number;
}

export interface ClickOptions {
  ref: string;
  button?: 'left' | 'right' | 'middle';
  click_count?: 1 | 2 | 3;
  headed?: boolean;
}

export interface TypeOptions {
  ref: string;
  text: string;
  clear_first?: boolean;
  headed?: boolean;
  delay_ms?: number;
}

export interface FillOptions {
  ref: string;
  value: string;
}

export interface PressOptions {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

export interface LaunchOptions {
  app: string;
  args?: string[];
  wait_for_window?: boolean;
  timeout_ms?: number;
}

export interface DesktopActionResult<T = any> {
  success: boolean;
  action: DesktopActionType;
  target_ref?: string;
  data?: T;
  error?: string;
  execution_time_ms: number;
  verified?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  version: string;
  binary_path: string;
  launcher_active: boolean;
  interactive_station: boolean;
  diagnostics: {
    can_enumerate_apps: boolean;
    uia_available: boolean;
  };
  checked_at: string;
}

