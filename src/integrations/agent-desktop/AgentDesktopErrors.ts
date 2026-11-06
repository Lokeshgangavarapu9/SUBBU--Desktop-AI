/**
 * AgentDesktopErrors.ts
 * Standardized error hierarchy and taxonomy for desktop automation in SUBBU.
 */

export enum DesktopErrorCode {
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  REF_STALE = 'REF_STALE',
  POLICY_DENIED = 'POLICY_DENIED',
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  APPLICATION_BLOCKED = 'APPLICATION_BLOCKED',
  STATION_NOT_INTERACTIVE = 'STATION_NOT_INTERACTIVE',
  TIMEOUT = 'TIMEOUT',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  BINARY_NOT_FOUND = 'BINARY_NOT_FOUND',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  ACTION_FAILED = 'ACTION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  action?: string;
  ref?: string;
  app?: string;
  arg?: string;
  raw_error?: string;
  details?: Record<string, any>;
}

export class AgentDesktopError extends Error {
  public readonly code: DesktopErrorCode;
  public readonly context: ErrorContext;
  public readonly isRecoverable: boolean;
  public readonly suggestedAction?: string;

  constructor(
    message: string,
    code: DesktopErrorCode = DesktopErrorCode.UNKNOWN_ERROR,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'AgentDesktopError';
    this.code = code;
    this.context = context;

    // Determine recovery characteristics
    switch (code) {
      case DesktopErrorCode.REF_STALE:
      case DesktopErrorCode.ELEMENT_NOT_FOUND:
        this.isRecoverable = true;
        this.suggestedAction = 'Capture a fresh snapshot and re-locate the target element reference.';
        break;
      case DesktopErrorCode.POLICY_DENIED:
        this.isRecoverable = true;
        this.suggestedAction = 'Retry with headed mode (--headed) or use physical keyboard typing.';
        break;
      case DesktopErrorCode.STATION_NOT_INTERACTIVE:
        this.isRecoverable = false;
        this.suggestedAction = 'Ensure command runs via agent-desktop-launcher.exe in interactive user session.';
        break;
      case DesktopErrorCode.APPLICATION_BLOCKED:
        this.isRecoverable = false;
        this.suggestedAction = 'Target application is outside the permitted whitelist.';
        break;
      default:
        this.isRecoverable = false;
        this.suggestedAction = undefined;
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      isRecoverable: this.isRecoverable,
      suggestedAction: this.suggestedAction,
    };
  }
}

export function parseDesktopError(rawError: string | Error, action?: string, ref?: string): AgentDesktopError {
  const msg = typeof rawError === 'string' ? rawError : rawError.message;

  if (msg.includes('ELEMENT_NOT_FOUND') || msg.includes('not found') || msg.includes('no element')) {
    return new AgentDesktopError(msg, DesktopErrorCode.ELEMENT_NOT_FOUND, { action, ref, raw_error: msg });
  }

  if (msg.includes('stale') || msg.includes('expired') || msg.includes('invalid ref')) {
    return new AgentDesktopError(msg, DesktopErrorCode.REF_STALE, { action, ref, raw_error: msg });
  }

  if (msg.includes('POLICY_DENIED') || msg.includes('permission denied')) {
    return new AgentDesktopError(msg, DesktopErrorCode.POLICY_DENIED, { action, ref, raw_error: msg });
  }

  if (msg.includes('EnumWindows failed') || msg.includes('WinSta0') || msg.includes('station')) {
    return new AgentDesktopError(msg, DesktopErrorCode.STATION_NOT_INTERACTIVE, { action, raw_error: msg });
  }

  if (msg.includes('timed out') || msg.includes('ETIMEDOUT')) {
    return new AgentDesktopError(msg, DesktopErrorCode.TIMEOUT, { action, raw_error: msg });
  }

  return new AgentDesktopError(msg, DesktopErrorCode.ACTION_FAILED, { action, ref, raw_error: msg });
}
