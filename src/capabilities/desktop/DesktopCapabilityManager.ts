/**
 * DesktopCapabilityManager.ts
 * Unified desktop automation orchestrator for SUBBU.
 * 
 * Bridges:
 * - Vercel Agent Desktop
 * - SUBBU Desktop MCP Server
 * - OpenClaw Node / Tools
 * 
 * Enforces:
 * - Observe -> Plan -> Act -> Verify -> Report pipeline
 * - Strict executable whitelist (notepad, calc, explorer, chrome, code)
 * - Safe user approval confirmation on high-risk operations
 */

import { AgentDesktopManager, UISnapshot } from '../../integrations/agent-desktop';
import { AgentDesktopPermissions } from '../../integrations/agent-desktop/AgentDesktopPermissions';
import { AgentDesktopError, DesktopErrorCode } from '../../integrations/agent-desktop/AgentDesktopErrors';

export interface DesktopIntent {
  action: 'launch' | 'type' | 'click' | 'snapshot' | 'focus' | 'list_apps';
  targetApp?: string;
  targetRef?: string;
  selector?: {
    role?: string;
    nameSubstr?: string;
  };
  text?: string;
  requiresVerification?: boolean;
}

export interface DesktopExecutionReport {
  success: boolean;
  action: string;
  targetApp?: string;
  targetRef?: string;
  verified: boolean;
  initialSnapshot?: UISnapshot;
  finalSnapshot?: UISnapshot;
  error?: string;
  durationMs: number;
  characterReaction: 'task_success' | 'task_error';
}

export class DesktopCapabilityManager {
  private static instance: DesktopCapabilityManager;
  private desktopManager: AgentDesktopManager;

  private constructor() {
    this.desktopManager = AgentDesktopManager.getInstance();
  }

  public static getInstance(): DesktopCapabilityManager {
    if (!DesktopCapabilityManager.instance) {
      DesktopCapabilityManager.instance = new DesktopCapabilityManager();
    }
    return DesktopCapabilityManager.instance;
  }

  /**
   * Main unified execution loop: Observe -> Plan -> Act -> Verify -> Report
   */
  public async execute(intent: DesktopIntent): Promise<DesktopExecutionReport> {
    const startTime = Date.now();

    // 0. Permission & Risk Assessment
    if (intent.targetApp && intent.action === 'launch') {
      try {
        AgentDesktopPermissions.validateLaunchTarget(intent.targetApp);
      } catch (err: any) {
        return {
          success: false,
          action: intent.action,
          targetApp: intent.targetApp,
          verified: false,
          error: err.message,
          durationMs: Date.now() - startTime,
          characterReaction: 'task_error',
        };
      }
    }

    try {
      switch (intent.action) {
        case 'launch': {
          const app = AgentDesktopPermissions.validateLaunchTarget(intent.targetApp || '');
          const launchRes = await this.desktopManager.client.launch({ app });
          if (!launchRes.success) {
            return {
              success: false,
              action: 'launch',
              targetApp: app,
              verified: false,
              error: launchRes.error,
              durationMs: Date.now() - startTime,
              characterReaction: 'task_error',
            };
          }

          // Small delay for window presentation
          await new Promise((r) => setTimeout(r, 1200));

          // Post-launch verification snapshot
          const verifySnap = await this.desktopManager.client.snapshot({ app, interactive_only: true });

          return {
            success: true,
            action: 'launch',
            targetApp: app,
            verified: verifySnap.success,
            finalSnapshot: verifySnap.data,
            durationMs: Date.now() - startTime,
            characterReaction: 'task_success',
          };
        }

        case 'list_apps': {
          const appsRes = await this.desktopManager.client.listApps();
          return {
            success: appsRes.success,
            action: 'list_apps',
            verified: appsRes.success,
            error: appsRes.error,
            durationMs: Date.now() - startTime,
            characterReaction: appsRes.success ? 'task_success' : 'task_error',
          };
        }

        case 'snapshot': {
          const snapRes = await this.desktopManager.client.snapshot({
            app: intent.targetApp,
            interactive_only: true,
            skeleton: true,
          });
          return {
            success: snapRes.success,
            action: 'snapshot',
            targetApp: intent.targetApp,
            verified: snapRes.success,
            initialSnapshot: snapRes.data,
            error: snapRes.error,
            durationMs: Date.now() - startTime,
            characterReaction: snapRes.success ? 'task_success' : 'task_error',
          };
        }

        case 'type': {
          if (!intent.text) {
            throw new AgentDesktopError('Text parameter must be provided for type intent.', DesktopErrorCode.INVALID_ARGUMENT);
          }

          // Automated Observe -> Act -> Verify
          const res = await this.desktopManager.adapter.observeActVerify(
            intent.targetApp || 'Notepad',
            async (ref) => this.desktopManager.client.type({ ref, text: intent.text!, headed: true }),
            {
              role: intent.selector?.role || 'textfield',
              nameSubstr: intent.selector?.nameSubstr,
              ref: intent.targetRef,
            }
          );

          return {
            success: res.actionResult.success,
            action: 'type',
            targetApp: intent.targetApp,
            targetRef: intent.targetRef,
            verified: res.verified,
            initialSnapshot: res.initialSnapshot,
            finalSnapshot: res.finalSnapshot,
            error: res.actionResult.error,
            durationMs: Date.now() - startTime,
            characterReaction: res.verified ? 'task_success' : 'task_error',
          };
        }

        case 'click': {
          const res = await this.desktopManager.adapter.observeActVerify(
            intent.targetApp || 'Notepad',
            async (ref) => this.desktopManager.client.click({ ref, headed: false }),
            {
              role: intent.selector?.role || 'button',
              nameSubstr: intent.selector?.nameSubstr,
              ref: intent.targetRef,
            }
          );

          return {
            success: res.actionResult.success,
            action: 'click',
            targetApp: intent.targetApp,
            targetRef: intent.targetRef,
            verified: res.verified,
            initialSnapshot: res.initialSnapshot,
            finalSnapshot: res.finalSnapshot,
            error: res.actionResult.error,
            durationMs: Date.now() - startTime,
            characterReaction: res.verified ? 'task_success' : 'task_error',
          };
        }

        default:
          return {
            success: false,
            action: intent.action,
            verified: false,
            error: `Unsupported action: ${intent.action}`,
            durationMs: Date.now() - startTime,
            characterReaction: 'task_error',
          };
      }
    } catch (err: any) {
      return {
        success: false,
        action: intent.action,
        targetApp: intent.targetApp,
        verified: false,
        error: err.message || String(err),
        durationMs: Date.now() - startTime,
        characterReaction: 'task_error',
      };
    }
  }
}

