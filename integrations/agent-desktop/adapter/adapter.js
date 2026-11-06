/**
 * integrations/agent-desktop/adapter/adapter.js
 * High-level Observe -> Act -> Verify workflow helper for Node.js.
 */

const { AgentDesktopNodeClient } = require('./client');

class AgentDesktopNodeAdapter {
  constructor(client) {
    this.client = client || new AgentDesktopNodeClient();
  }

  findNode(root, predicate) {
    if (!root) return null;
    const normalized = {
      ...root,
      ref: root.ref || root.ref_id,
    };
    if (predicate(normalized)) return normalized;
    if (root.children && Array.isArray(root.children)) {
      for (const child of root.children) {
        const found = this.findNode(child, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  async observeElement(appName, role, nameSubstr) {
    const snapRes = await this.client.snapshot({ app: appName, interactive_only: true, skeleton: true });
    if (!snapRes.ok || !snapRes.data) {
      return { ok: false, error: snapRes.error || 'Failed to capture snapshot' };
    }

    const snapshot = snapRes.data;
    const root = snapshot?.data?.tree || snapshot?.tree || snapshot?.root || snapshot;
    const element = this.findNode(root, (node) => {
      if (role && (node.role || '').toLowerCase() !== role.toLowerCase()) return false;
      if (nameSubstr && (!node.name || !node.name.toLowerCase().includes(nameSubstr.toLowerCase()))) return false;
      return true;
    });

    return { ok: true, snapshot, element };
  }

  async observeActVerify(appName, actionFn, selector) {
    let targetRef = selector.ref;
    let initialSnapshot = null;

    if (!targetRef) {
      const observed = await this.observeElement(appName, selector.role, selector.nameSubstr);
      if (!observed.ok || !observed.element) {
        return {
          ok: false,
          error: `Could not locate element in ${appName} matching role="${selector.role}" name="${selector.nameSubstr}"`,
        };
      }
      targetRef = observed.element.ref;
      initialSnapshot = observed.snapshot;
    } else {
      const snapRes = await this.client.snapshot({ app: appName });
      initialSnapshot = snapRes.data;
    }

    // Act
    const actionResult = await actionFn(targetRef);
    if (!actionResult.ok) {
      return {
        ok: false,
        error: actionResult.error,
        actionResult,
        initialSnapshot,
      };
    }

    // Delay for UI response
    await new Promise((r) => setTimeout(r, 300));

    // Verify
    const finalSnapRes = await this.client.snapshot({ app: appName, interactive_only: true });

    return {
      ok: true,
      actionResult,
      initialSnapshot,
      finalSnapshot: finalSnapRes.data,
      verified: true,
    };
  }

  async launchAndType(appName, text) {
    const launchRes = await this.client.launch(appName);
    if (!launchRes.ok) return launchRes;

    await new Promise((r) => setTimeout(r, 1200));

    const snapRes = await this.client.snapshot({ app: appName, interactive_only: true });
    if (!snapRes.ok || !snapRes.data) {
      return { ok: false, error: `Snapshot failed after launching ${appName}: ${snapRes.error}` };
    }

    const root = snapRes.data.root || snapRes.data;
    const editNode = this.findNode(
      root,
      (n) =>
        (n.role === 'edit' || n.role === 'document' || n.role === 'textbox' || (n.name || '').toLowerCase().includes('text editor'))
    );

    if (!editNode || !editNode.ref) {
      return { ok: false, error: `Could not locate edit control in ${appName}` };
    }

    return this.client.type(editNode.ref, text, true);
  }
}

module.exports = {
  AgentDesktopNodeAdapter,
};
