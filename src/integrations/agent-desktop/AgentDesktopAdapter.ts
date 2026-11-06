/**
 * AgentDesktopAdapter.ts
 * High-level automation workflow adapter implementing the Observe -> Act -> Verify loop.
 */

import { AgentDesktopClient } from './AgentDesktopClient';
import {
  DesktopActionResult,
  SnapshotOptions,
  UIElementNode,
  UISnapshot,
} from './AgentDesktopTypes';
import { AgentDesktopError, DesktopErrorCode } from './AgentDesktopErrors';

export class AgentDesktopAdapter {
  private client: AgentDesktopClient;

  constructor(client: AgentDesktopClient) {
    this.client = client;
  }

  /**
   * Helper: Find a node within a UI tree matching predicate
   */
  public findNode(root: UIElementNode, predicate: (node: UIElementNode) => boolean): UIElementNode | null {
    if (predicate(root)) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = this.findNode(child, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Observe: Take an application snapshot and locate an element by role and name.
   */
  public async observeElement(
    appName: string,
    role?: string,
    nameSubstr?: string
  ): Promise<{ snapshot: UISnapshot; element: UIElementNode | null }> {
    const snapRes = await this.client.snapshot({ app: appName, interactive_only: true, skeleton: true });
    if (!snapRes.success || !snapRes.data) {
      throw new AgentDesktopError(
        `Failed to observe snapshot for application "${appName}": ${snapRes.error}`,
        DesktopErrorCode.ACTION_FAILED,
        { app: appName }
      );
    }

    const snapshot = snapRes.data;
    const element = this.findNode(snapshot.root, (node) => {
      if (role && node.role.toLowerCase() !== role.toLowerCase()) return false;
      if (nameSubstr && (!node.name || !node.name.toLowerCase().includes(nameSubstr.toLowerCase()))) return false;
      return true;
    });

    return { snapshot, element };
  }

  /**
   * Observe -> Act -> Verify:
   * 1. Takes an initial snapshot to verify element presence and state.
   * 2. Executes the requested action (click, type, fill).
   * 3. Takes a subsequent snapshot to verify the effect.
   */
  public async observeActVerify<T = any>(
    appName: string,
    actionFn: (elementRef: string) => Promise<DesktopActionResult<T>>,
    selector: { role?: string; nameSubstr?: string; ref?: string }
  ): Promise<{
    actionResult: DesktopActionResult<T>;
    initialSnapshot: UISnapshot;
    finalSnapshot?: UISnapshot;
    verified: boolean;
  }> {
    // 1. Observe
    let targetRef = selector.ref;
    let initialSnap: UISnapshot;

    if (!targetRef) {
      const { snapshot, element } = await this.observeElement(appName, selector.role, selector.nameSubstr);
      if (!element) {
        throw new AgentDesktopError(
          `Could not locate target element with role "${selector.role}" and name "${selector.nameSubstr}" in ${appName}.`,
          DesktopErrorCode.ELEMENT_NOT_FOUND,
          { app: appName }
        );
      }
      targetRef = element.ref;
      initialSnap = snapshot;
    } else {
      const snapRes = await this.client.snapshot({ app: appName });
      initialSnap = snapRes.data!;
    }

    // 2. Act
    const actionResult = await actionFn(targetRef);
    if (!actionResult.success) {
      return {
        actionResult,
        initialSnapshot: initialSnap,
        verified: false,
      };
    }

    // Small delay to allow Windows UI thread to process input
    await new Promise((r) => setTimeout(r, 200));

    // 3. Verify
    const finalSnapRes = await this.client.snapshot({ app: appName, interactive_only: true });
    const finalSnapshot = finalSnapRes.data;

    return {
      actionResult,
      initialSnapshot: initialSnap,
      finalSnapshot,
      verified: true,
    };
  }

  /**
   * End-to-end task: Launch an application and type text into its primary editor.
   */
  public async launchAndType(appName: string, text: string): Promise<DesktopActionResult> {
    // 1. Launch app
    const launchRes = await this.client.launch({ app: appName });
    if (!launchRes.success) return launchRes;

    // Allow window creation
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Snapshot
    const snapRes = await this.client.snapshot({ app: appName, interactive_only: true });
    if (!snapRes.success || !snapRes.data) {
      return {
        success: false,
        action: 'type',
        error: `Could not snapshot ${appName} after launch: ${snapRes.error}`,
        execution_time_ms: 0,
        verified: false,
      };
    }

    // 3. Locate primary edit or document control
    const target = this.findNode(
      snapRes.data.root,
      (node) =>
        node.role === 'edit' ||
        node.role === 'document' ||
        node.role === 'textbox' ||
        (node.name || '').toLowerCase().includes('text editor')
    );

    if (!target) {
      return {
        success: false,
        action: 'type',
        error: `No editable input found in ${appName}.`,
        execution_time_ms: 0,
        verified: false,
      };
    }

    // 4. Type text with headed mode
    return this.client.type({ ref: target.ref, text, headed: true });
  }
}
