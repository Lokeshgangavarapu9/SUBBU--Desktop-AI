/**
 * AgentDesktopPermissions.ts
 * Whitelists, risk assessment, and safety boundaries for desktop automation in SUBBU.
 */

import { DesktopActionType, RiskLevel } from './AgentDesktopTypes';
import { AgentDesktopError, DesktopErrorCode } from './AgentDesktopErrors';

// Strict whitelist of permitted launch targets
export const PERMITTED_LAUNCH_APPS = new Set([
  'notepad',
  'notepad.exe',
  'calc',
  'calculator',
  'calc.exe',
  'explorer',
  'explorer.exe',
  'chrome',
  'chrome.exe',
  'code',
  'code.cmd'
]);

// Blocked substrings in arguments to prevent command chaining / shell injection
export const BLOCKED_COMMAND_PATTERNS = [
  ';',
  '&',
  '|',
  '>',
  '<',
  '`',
  '$',
  '%',
  'powershell',
  'cmd.exe',
  'certutil',
  'bitsadmin',
  'curl',
  'wget',
  'rmdir',
  'del',
];

export class AgentDesktopPermissions {
  /**
   * Assess the risk level of a desktop operation.
   */
  public static getRiskLevel(action: DesktopActionType, target?: string): RiskLevel {
    switch (action) {
      case 'list-apps':
      case 'list-windows':
      case 'list-displays':
      case 'snapshot':
      case 'find':
      case 'get':
      case 'is':
      case 'status':
      case 'permissions':
        return 'low';

      case 'focus':
      case 'focus-window':
      case 'minimize':
      case 'maximize':
      case 'restore':
      case 'type':
      case 'set-value':
      case 'clear':
      case 'click':
      case 'double-click':
      case 'triple-click':
      case 'press':
      case 'scroll':
        return 'medium';

      case 'launch':
      case 'close-app':
      case 'clipboard-set':
        return 'high';

      default:
        return 'medium';
    }
  }

  /**
   * Validate that an application target is authorized for launching.
   */
  public static validateLaunchTarget(app: string): string {
    if (!app || typeof app !== 'string') {
      throw new AgentDesktopError('Application name must be a non-empty string.', DesktopErrorCode.INVALID_ARGUMENT);
    }

    const cleanApp = app.trim().toLowerCase();
    const baseName = cleanApp.split(/[\\/]/).pop() || '';

    if (!PERMITTED_LAUNCH_APPS.has(cleanApp) && !PERMITTED_LAUNCH_APPS.has(baseName)) {
      throw new AgentDesktopError(
        `Application "${app}" is not in the permitted whitelist. Permitted: ${Array.from(PERMITTED_LAUNCH_APPS).join(', ')}`,
        DesktopErrorCode.APPLICATION_BLOCKED,
        { app }
      );
    }

    if (baseName === 'calculator' || baseName === 'calculator.exe') {
      return 'calc';
    }

    return baseName;
  }

  /**
   * Validate snapshot @ref element token format: @<snapshot_id>:e<number>
   */
  public static isValidRef(ref: string): boolean {
    if (typeof ref !== 'string') return false;
    return /^@[a-zA-Z0-9_-]+:e\d+$/.test(ref);
  }

  /**
   * Check for shell injection characters in argument strings.
   */
  public static sanitizeArgument(arg: string): string {
    if (typeof arg !== 'string') return '';
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
      if (arg.includes(pattern)) {
        throw new AgentDesktopError(
          `Argument contains disallowed safety pattern: "${pattern}"`,
          DesktopErrorCode.INVALID_ARGUMENT,
          { arg }
        );
      }
    }
    return arg;
  }

  /**
   * Determines whether an action requires explicit user approval in SUBBU.
   */
  public static requiresUserApproval(action: DesktopActionType, appName?: string): boolean {
    const risk = this.getRiskLevel(action, appName);
    return risk === 'high' || risk === 'critical';
  }
}

