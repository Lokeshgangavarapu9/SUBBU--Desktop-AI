/**
 * integrations/agent-desktop/adapter/client.js
 * Native Node.js execution client targeting agent-desktop-launcher.exe.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { isValidRef, sanitizeArgument, validateLaunchTarget } = require('./permissions');

// Prefer C# launcher wrapper to guarantee WinSta0\Default desktop station binding
const LAUNCHER_EXE = path.resolve(__dirname, '../../../agent-desktop-launcher.exe');
const NATIVE_EXE = path.join(
  process.env.APPDATA || 'C:\\Users\\LOKESH\\AppData\\Roaming',
  'npm',
  'node_modules',
  'agent-desktop',
  'bin',
  'agent-desktop-win32-x64.exe'
);

const EXECUTABLE = fs.existsSync(LAUNCHER_EXE) ? LAUNCHER_EXE : NATIVE_EXE;

function executeRaw(args, timeoutMs = 45000) {
  return new Promise((resolve) => {
    execFile(
      EXECUTABLE,
      args,
      {
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const trimmed = (stdout || '').trim();
        const errTrimmed = (stderr || '').trim();

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            resolve({ ok: !error, data: parsed, raw: trimmed });
            return;
          } catch (e) {
            // fall through
          }
        }

        if (error) {
          resolve({
            ok: false,
            error: trimmed || errTrimmed || error.message,
            code: error.code,
          });
        } else {
          resolve({
            ok: true,
            output: trimmed || errTrimmed,
            raw: trimmed,
          });
        }
      }
    );
  });
}

class AgentDesktopNodeClient {
  constructor(customExecutable) {
    this.executable = customExecutable || EXECUTABLE;
  }

  async listApps(filter) {
    const args = ['list-apps'];
    if (filter) args.push(sanitizeArgument(filter));
    return executeRaw(args);
  }

  async listWindows(app) {
    const args = ['list-windows'];
    if (app) args.push('--app', sanitizeArgument(app));
    return executeRaw(args);
  }

  async listDisplays() {
    return executeRaw(['list-displays']);
  }

  async snapshot(options = {}) {
    const args = ['snapshot'];
    if (options.app) args.push('--app', sanitizeArgument(options.app));
    if (options.window_id) args.push('--window-id', sanitizeArgument(options.window_id));
    if (options.interactive_only ?? true) args.push('--interactive-only');
    if (options.skeleton ?? true) args.push('--skeleton');
    if (options.compact ?? true) args.push('--compact');
    
    let result = await executeRaw(args);
    // Auto-disambiguate if multiple windows exist
    if (!result.ok && result.data?.error?.code === 'AMBIGUOUS_TARGET' && Array.isArray(result.data?.error?.details?.candidates) && result.data.error.details.candidates.length > 0) {
      const firstWin = result.data.error.details.candidates[0].id;
      const fallbackArgs = ['snapshot', '--window-id', firstWin];
      if (options.interactive_only ?? true) fallbackArgs.push('--interactive-only');
      if (options.skeleton ?? true) fallbackArgs.push('--skeleton');
      if (options.compact ?? true) fallbackArgs.push('--compact');
      result = await executeRaw(fallbackArgs);
    }
    return result;
  }

  async click(ref, headed = false) {
    if (!isValidRef(ref)) {
      return { ok: false, error: `Invalid ref: "${ref}". Must match @<snapshot_id>:e<number>` };
    }
    const args = ['click', ref];
    if (headed) args.push('--headed');
    let res = await executeRaw(args);
    if (!res.ok) {
      // Retry without headed (semantic UIA InvokePattern)
      if (headed) {
        res = await executeRaw(['click', ref]);
      }
      // If still not ok, fall back to focus
      if (!res.ok) {
        const focusRes = await executeRaw(['focus', ref]);
        if (focusRes.ok) res = focusRes;
      }
    }
    return res;
  }

  async type(ref, text, headed = true) {
    if (!isValidRef(ref)) {
      return { ok: false, error: `Invalid ref: "${ref}"` };
    }
    const args = ['type', ref, text];
    if (headed) args.push('--headed');
    let res = await executeRaw(args);
    if (!res.ok) {
      const setVal = await this.fill(ref, text);
      if (setVal.ok) res = setVal;
    }
    return res;
  }

  async fill(ref, value) {
    if (!isValidRef(ref)) {
      return { ok: false, error: `Invalid ref: "${ref}"` };
    }
    return executeRaw(['set-value', ref, value]);
  }

  async launch(app, timeoutMs = 8000) {
    try {
      const valid = validateLaunchTarget(app);
      return await executeRaw(['launch', valid, '--activate'], timeoutMs);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async getStatus() {
    const versionRes = await executeRaw(['--version']);
    const appsRes = await this.listApps();
    return {
      ok: appsRes.ok,
      version: versionRes.raw || 'unknown',
      launcher_present: fs.existsSync(LAUNCHER_EXE),
      interactive: appsRes.ok,
      executable: EXECUTABLE,
    };
  }
}

module.exports = {
  AgentDesktopNodeClient,
  executeRaw,
  EXECUTABLE,
  LAUNCHER_EXE,
};
