/**
 * AgentDesktopClient.ts
 * Execution client for Agent Desktop CLI / MCP operations.
 * Supports both direct execution (Node.js environments) and Gateway RPC (browser frontend).
 */

import {
  AppInfo,
  ClickOptions,
  DesktopActionResult,
  DesktopActionType,
  DisplayInfo,
  FillOptions,
  LaunchOptions,
  PressOptions,
  SnapshotOptions,
  TypeOptions,
  UISnapshot,
  WindowInfo,
} from './AgentDesktopTypes';
import { AgentDesktopPermissions } from './AgentDesktopPermissions';
import { AgentDesktopError, DesktopErrorCode, parseDesktopError } from './AgentDesktopErrors';
import { AgentDesktopEvents } from './AgentDesktopEvents';

export type CommandExecutor = (args: string[]) => Promise<{ ok: boolean; data?: any; error?: string; raw?: string }>;

export class AgentDesktopClient {
  private executor: CommandExecutor;
  private events: AgentDesktopEvents;

  constructor(customExecutor?: CommandExecutor) {
    this.events = AgentDesktopEvents.getInstance();
    if (customExecutor) {
      this.executor = customExecutor;
    } else {
      // Native Tauri or browser fallback executor
      this.executor = async (args: string[]) => {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const res = await invoke<{ ok: boolean; data?: any; output?: string; error?: string }>(
              'execute_desktop_command',
              { args }
            );
            return {
              ok: res.ok,
              data: res.data,
              raw: res.output,
              error: res.error,
            };
          } catch (tauriErr: any) {
            console.warn('[AgentDesktopClient] Tauri invoke failed, falling back:', tauriErr);
          }
        }

        try {
          const res = await fetch('/api/desktop/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ args }),
          });
          if (!res.ok) {
            return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
          }
          return await res.json();
        } catch (e: any) {
          return { ok: false, error: e.message || 'Failed to connect to desktop execution service.' };
        }
      };
    }
  }

  public setExecutor(executor: CommandExecutor): void {
    this.executor = executor;
  }

  private async executeAction<T>(
    action: DesktopActionType,
    args: string[],
    targetRef?: string
  ): Promise<DesktopActionResult<T>> {
    const startTime = Date.now();
    this.events.emit('action:start', { action, target: targetRef, timestamp: startTime });

    try {
      const res = await this.executor(args);
      const executionTime = Date.now() - startTime;

      if (!res.ok) {
        const errorMsg = res.error || 'Execution returned non-zero code.';
        this.events.emit('action:error', { action, target: targetRef, error: errorMsg, timestamp: Date.now() });
        return {
          success: false,
          action,
          target_ref: targetRef,
          error: errorMsg,
          execution_time_ms: executionTime,
          verified: false,
        };
      }

      const result: DesktopActionResult<T> = {
        success: true,
        action,
        target_ref: targetRef,
        data: (res.data !== undefined ? res.data : res.raw) as T,
        execution_time_ms: executionTime,
        verified: true,
      };

      this.events.emit('action:success', result);
      return result;
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      const parsed = parseDesktopError(err, action, targetRef);
      this.events.emit('action:error', { action, target: targetRef, error: parsed.message, timestamp: Date.now() });

      return {
        success: false,
        action,
        target_ref: targetRef,
        error: parsed.message,
        execution_time_ms: executionTime,
        verified: false,
      };
    }
  }

  /**
   * List all running GUI desktop applications.
   */
  public async listApps(filter?: string): Promise<DesktopActionResult<AppInfo[]>> {
    const args = ['list-apps'];
    if (filter) {
      args.push(AgentDesktopPermissions.sanitizeArgument(filter));
    }
    return this.executeAction<AppInfo[]>('list-apps', args);
  }

  /**
   * List all open windows.
   */
  public async listWindows(app?: string): Promise<DesktopActionResult<WindowInfo[]>> {
    const args = ['list-windows'];
    if (app) {
      args.push('--app', AgentDesktopPermissions.sanitizeArgument(app));
    }
    return this.executeAction<WindowInfo[]>('list-windows', args);
  }

  /**
   * List attached monitors/displays.
   */
  public async listDisplays(): Promise<DesktopActionResult<DisplayInfo[]>> {
    return this.executeAction<DisplayInfo[]>('list-displays', ['list-displays']);
  }

  /**
   * Capture a structured UI snapshot.
   */
  public async snapshot(options: SnapshotOptions = {}): Promise<DesktopActionResult<UISnapshot>> {
    const args = ['snapshot'];
    if (options.app) {
      args.push('--app', AgentDesktopPermissions.sanitizeArgument(options.app));
    }
    if (options.window_id) {
      args.push('--window-id', AgentDesktopPermissions.sanitizeArgument(options.window_id));
    }
    if (options.interactive_only ?? true) {
      args.push('--interactive-only');
    }
    if (options.skeleton ?? true) {
      args.push('--skeleton');
    }
    if (options.compact ?? true) {
      args.push('--compact');
    }
    if (options.depth) {
      args.push('--depth', options.depth.toString());
    }

    const res = await this.executeAction<UISnapshot>('snapshot', args);
    if (res.success && res.data) {
      this.events.emit('snapshot:captured', res.data);
    }
    return res;
  }

  /**
   * Click an element by @ref token.
   */
  public async click(options: ClickOptions): Promise<DesktopActionResult> {
    if (!AgentDesktopPermissions.isValidRef(options.ref)) {
      throw new AgentDesktopError(
        `Invalid @ref identifier: "${options.ref}". Expected format: @<id>:e<num>`,
        DesktopErrorCode.INVALID_ARGUMENT
      );
    }

    const action: DesktopActionType =
      options.click_count === 2 ? 'double-click' : options.click_count === 3 ? 'triple-click' : 'click';
    const args = [action, options.ref];
    if (options.headed ?? true) {
      args.push('--headed');
    }

    return this.executeAction(action, args, options.ref);
  }

  /**
   * Type text into an element.
   */
  public async type(options: TypeOptions): Promise<DesktopActionResult> {
    if (!AgentDesktopPermissions.isValidRef(options.ref)) {
      throw new AgentDesktopError(
        `Invalid @ref identifier: "${options.ref}"`,
        DesktopErrorCode.INVALID_ARGUMENT
      );
    }

    const args = ['type', options.ref, options.text];
    if (options.headed ?? true) {
      args.push('--headed');
    }
    if (options.clear_first) {
      args.push('--clear');
    }

    return this.executeAction('type', args, options.ref);
  }

  /**
   * Directly set an element value via ValuePattern.
   */
  public async fill(options: FillOptions): Promise<DesktopActionResult> {
    if (!AgentDesktopPermissions.isValidRef(options.ref)) {
      throw new AgentDesktopError(
        `Invalid @ref identifier: "${options.ref}"`,
        DesktopErrorCode.INVALID_ARGUMENT
      );
    }

    const args = ['set-value', options.ref, options.value];
    return this.executeAction('set-value', args, options.ref);
  }

  /**
   * Clear an input element's text.
   */
  public async clear(ref: string): Promise<DesktopActionResult> {
    if (!AgentDesktopPermissions.isValidRef(ref)) {
      throw new AgentDesktopError(`Invalid @ref identifier: "${ref}"`, DesktopErrorCode.INVALID_ARGUMENT);
    }
    return this.executeAction('clear', ['clear', ref], ref);
  }

  /**
   * Focus a target element.
   */
  public async focus(ref: string): Promise<DesktopActionResult> {
    if (!AgentDesktopPermissions.isValidRef(ref)) {
      throw new AgentDesktopError(`Invalid @ref identifier: "${ref}"`, DesktopErrorCode.INVALID_ARGUMENT);
    }
    return this.executeAction('focus', ['focus', ref], ref);
  }

  /**
   * Press a key or shortcut.
   */
  public async press(options: PressOptions): Promise<DesktopActionResult> {
    const args = ['press', options.key];
    if (options.modifiers && options.modifiers.length > 0) {
      for (const mod of options.modifiers) {
        args.push(`--${mod}`);
      }
    }
    return this.executeAction('press', args);
  }

  /**
   * Launch a whitelisted application.
   */
  public async launch(options: LaunchOptions): Promise<DesktopActionResult> {
    const validatedApp = AgentDesktopPermissions.validateLaunchTarget(options.app);
    const args = ['launch', validatedApp];
    if (options.args && options.args.length > 0) {
      for (const arg of options.args) {
        args.push(AgentDesktopPermissions.sanitizeArgument(arg));
      }
    }
    return this.executeAction('launch', args);
  }

  /**
   * Focus a window.
   */
  public async focusWindow(windowId: string): Promise<DesktopActionResult> {
    return this.executeAction('focus-window', ['focus-window', windowId]);
  }

  /**
   * Get clipboard text.
   */
  public async clipboardGet(): Promise<DesktopActionResult<string>> {
    return this.executeAction<string>('clipboard-get', ['clipboard-get']);
  }

  /**
   * Set clipboard text.
   */
  public async clipboardSet(text: string): Promise<DesktopActionResult> {
    return this.executeAction('clipboard-set', ['clipboard-set', text]);
  }
}
