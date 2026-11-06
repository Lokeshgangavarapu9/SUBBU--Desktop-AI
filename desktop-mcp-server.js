#!/usr/bin/env node
/**
 * desktop-mcp-server.js
 * 
 * Local Model Context Protocol (MCP) stdio server for Subbu.
 * Bridges OpenClaw / AI agents to Vercel agent-desktop via Microsoft UI Automation (UIA).
 * 
 * Zero external npm dependencies: uses native Node.js core modules (readline, child_process, path).
 * Enforces strict argument validation, single-quoted ref safety, timeout safety, and risk safeguards.
 */

const { execFile } = require('child_process');
const readline = require('readline');
const path = require('path');

// Path to agent-desktop execution binary (prefer launcher wrapper to guarantee WinSta0\\Default desktop station)
const fs = require('fs');
const LAUNCHER_EXE = path.join(__dirname, 'agent-desktop-launcher.exe');
const NATIVE_EXE = path.join(
  process.env.APPDATA || 'C:\\Users\\LOKESH\\AppData\\Roaming',
  'npm',
  'node_modules',
  'agent-desktop',
  'bin',
  'agent-desktop-win32-x64.exe'
);
const AGENT_DESKTOP_EXE = fs.existsSync(LAUNCHER_EXE) ? LAUNCHER_EXE : NATIVE_EXE;

// Whitelist of permitted application launch targets (case-insensitive)
const PERMITTED_LAUNCH_APPS = new Set([
  'notepad',
  'notepad.exe',
  'calc',
  'calculator',
  'calc.exe',
  'calculator.exe',
  'explorer',
  'explorer.exe',
  'chrome',
  'chrome.exe',
  'msedge',
  'msedge.exe',
  'edge',
  'code',
  'code.cmd'
]);

// Helper: validate snapshot-qualified ref format: @<snapshot_id>:e<number>
function isValidRef(ref) {
  if (typeof ref !== 'string') return false;
  return /^@[a-zA-Z0-9_-]+:e\d+$/.test(ref);
}

// Low-level safe execution wrapper using execFile (no shell, prevents injection)
function executeAgentDesktop(args, timeoutMs = 15000) {
  return new Promise((resolve) => {
    execFile(AGENT_DESKTOP_EXE, args, {
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024 // 4 MB limit
    }, (error, stdout, stderr) => {
      const trimmed = (stdout || '').trim();
      const errTrimmed = (stderr || '').trim();

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          resolve({ ok: !error, data: parsed, raw: trimmed });
          return;
        } catch (e) {
          // Fall through to text resolution
        }
      }

      if (error) {
        resolve({
          ok: false,
          error: trimmed || errTrimmed || error.message
        });
      } else {
        resolve({
          ok: true,
          output: trimmed || errTrimmed
        });
      }
    });
  });
}

// Tool definitions for MCP tools/list
const TOOLS = [
  {
    name: 'desktop_list_apps',
    description: 'List all running GUI desktop applications detected via Windows UI Automation.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional application name filter (e.g. "Notepad", "Chrome")'
        }
      }
    }
  },
  {
    name: 'desktop_snapshot',
    description: 'Capture the UI accessibility tree of an application or window as structured JSON with @ref element IDs. Defaults to compact interactive skeleton for minimal token consumption.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Target application name (e.g. "Notepad", "Calculator")'
        },
        window_id: {
          type: 'string',
          description: 'Optional window ID from list-windows if multiple windows match'
        },
        interactive_only: {
          type: 'boolean',
          description: 'Only return interactive elements (buttons, inputs). Default is true.',
          default: true
        },
        skeleton: {
          type: 'boolean',
          description: 'Return shallow overview tree to conserve tokens. Default is true.',
          default: true
        },
        compact: {
          type: 'boolean',
          description: 'Collapse single-child nodes. Default is true.',
          default: true
        }
      }
    }
  },
  {
    name: 'desktop_click',
    description: 'Click an interactive UI element using its snapshot-qualified @ref ID.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Qualified reference from a fresh snapshot (e.g. "@s8f3k2p9:e12")'
        }
      },
      required: ['ref']
    }
  },
  {
    name: 'desktop_type',
    description: 'Insert text into a focused target element via keyboard simulation or headless input.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Qualified reference from snapshot'
        },
        text: {
          type: 'string',
          description: 'The text to type'
        },
        headed: {
          type: 'boolean',
          description: 'Pass true for legacy Win32 controls like Notepad where headless type returns POLICY_DENIED',
          default: true
        }
      },
      required: ['ref', 'text']
    }
  },
  {
    name: 'desktop_fill',
    description: 'Directly set an element value via accessibility ValuePattern (fast, reliable for modern form controls). Uses agent-desktop set-value under the hood.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Qualified reference from snapshot'
        },
        value: {
          type: 'string',
          description: 'The string value to set'
        }
      },
      required: ['ref', 'value']
    }
  },
  {
    name: 'desktop_launch',
    description: 'Launch an allowed Windows application: "notepad", "calculator", "chrome", "code", or "explorer".',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Application name to launch: "notepad", "calculator", "chrome", "code", or "explorer"'
        },
        application: {
          type: 'string',
          description: 'Alias for app'
        },
        activate: {
          type: 'boolean',
          description: 'Bring the app window forward once launched. Default is true.',
          default: true
        }
      }
    }
  },
  {
    name: 'desktop_list_windows',
    description: 'List all open top-level desktop windows with their window IDs, titles, and process IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Optional filter by application name'
        }
      }
    }
  },
  {
    name: 'desktop_focus_window',
    description: 'Bring a specific desktop window to the foreground using its window ID.',
    inputSchema: {
      type: 'object',
      properties: {
        window_id: {
          type: 'string',
          description: 'Window identifier from desktop_list_windows or desktop_snapshot'
        }
      },
      required: ['window_id']
    }
  },
  {
    name: 'desktop_find',
    description: 'Query and locate UI elements matching role or name patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          description: 'Target application name'
        },
        role: {
          type: 'string',
          description: 'Element role (e.g. "button", "edit", "menu item")'
        },
        name: {
          type: 'string',
          description: 'Element name or label substring'
        }
      }
    }
  },
  {
    name: 'desktop_get',
    description: 'Get properties or current value from an element reference.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Snapshot-qualified reference (e.g. "@s8f3k2p9:e12")'
        },
        property: {
          type: 'string',
          description: 'Property name to retrieve (e.g. "value", "name", "role", "bounds")'
        }
      },
      required: ['ref']
    }
  },
  {
    name: 'desktop_is',
    description: 'Verify state conditions (e.g. "enabled", "visible", "focused") on an element reference.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Snapshot-qualified reference'
        },
        condition: {
          type: 'string',
          description: 'Condition to test: "enabled", "disabled", "visible", "focused", "checked"'
        }
      },
      required: ['ref', 'condition']
    }
  },
  {
    name: 'desktop_press',
    description: 'Simulate pressing a keyboard key or shortcut combination (e.g. "enter", "escape", "tab", "ctrl+s").',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Key name (e.g. "enter", "escape", "tab", "backspace", "delete", "f5", "down", "up")'
        },
        modifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional modifiers: "ctrl", "alt", "shift", "meta"'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'desktop_clipboard_get',
    description: 'Read the current text content of the Windows system clipboard.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'desktop_clipboard_set',
    description: 'Write text to the Windows system clipboard.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to copy to clipboard'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'desktop_status',
    description: 'Check Agent Desktop version, UI Automation status, and interactive session availability.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Tool execution handler
async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'desktop_list_apps': {
      const cliArgs = ['list-apps'];
      if (args.filter && typeof args.filter === 'string') {
        const clean = args.filter.replace(/[^\w\s.-]/g, '').trim();
        if (clean) cliArgs.push('--app', clean);
      }
      return await executeAgentDesktop(cliArgs, 8000);
    }

    case 'desktop_snapshot': {
      const cliArgs = ['snapshot'];
      if (args.skeleton !== false) cliArgs.push('--skeleton');
      if (args.interactive_only !== false) cliArgs.push('-i');
      if (args.compact !== false) cliArgs.push('--compact');
      cliArgs.push('--timeout-ms', '10000');
      const targetApp = args.app || args.application || args.target;
      if (targetApp && typeof targetApp === 'string') {
        const clean = targetApp.replace(/[^\w\s.-]/g, '').trim();
        if (clean) cliArgs.push('--app', clean);
      }
      const winId = args.window_id || args.windowId || args.window;
      if (winId && typeof winId === 'string') {
        const cleanWin = winId.replace(/[^\w:-]/g, '').trim();
        if (cleanWin) cliArgs.push('--window-id', cleanWin);
      }
      let result = await executeAgentDesktop(cliArgs, 15000);
      if (!result.ok && result.data?.error?.code === 'AMBIGUOUS_TARGET' && Array.isArray(result.data?.error?.details?.candidates) && result.data.error.details.candidates.length > 0) {
        // Auto-select first matching window candidate if multiple exist
        const firstWin = result.data.error.details.candidates[0].id;
        const fallbackArgs = ['snapshot', '--window-id', firstWin, '--timeout-ms', '10000'];
        if (args.skeleton !== false) fallbackArgs.push('--skeleton');
        if (args.interactive_only !== false) fallbackArgs.push('-i');
        if (args.compact !== false) fallbackArgs.push('--compact');
        result = await executeAgentDesktop(fallbackArgs, 15000);
      }
      return result;
    }

    case 'desktop_click': {
      const ref = args.ref || args['@ref'] || args.target || args.element;
      if (!isValidRef(ref)) {
        return { ok: false, error: `Invalid ref format: "${ref}". Must be @<snapshot_id>:e<number>.` };
      }
      let clickRes = await executeAgentDesktop(['click', ref], 8000);
      if (!clickRes.ok && clickRes.data?.error?.code === 'ACTION_FAILED') {
        // Fall back to focus if Click is not supported on this element (e.g. document textfield)
        const focusRes = await executeAgentDesktop(['focus', ref], 8000);
        if (focusRes.ok) {
          clickRes = focusRes;
        }
      }
      return clickRes;
    }

    case 'desktop_type': {
      const ref = args.ref || args['@ref'] || args.target || args.element;
      const text = args.text !== undefined ? String(args.text) : (args.value !== undefined ? String(args.value) : (args.input !== undefined ? String(args.input) : null));
      if (!isValidRef(ref)) {
        return { ok: false, error: `Invalid ref format: "${ref}". Must be @<snapshot_id>:e<number>.` };
      }
      if (text === null) {
        return { ok: false, error: 'Text argument must be provided.' };
      }
      const cliArgs = ['type', ref, text];
      if (args.headed !== false) {
        cliArgs.push('--headed');
      }
      let typeRes = await executeAgentDesktop(cliArgs, 15000);
      if (!typeRes.ok) {
        // Fall back to direct value insertion if headed keyboard typing was blocked by foreground restriction
        const setValRes = await executeAgentDesktop(['set-value', ref, text], 8000);
        if (setValRes.ok) {
          typeRes = setValRes;
        }
      }
      return typeRes;
    }

    case 'desktop_fill': {
      const ref = args.ref || args['@ref'] || args.target || args.element;
      const val = args.value !== undefined ? String(args.value) : (args.text !== undefined ? String(args.text) : (args.input !== undefined ? String(args.input) : null));
      if (!isValidRef(ref)) {
        return { ok: false, error: `Invalid ref format: "${ref}". Must be @<snapshot_id>:e<number>.` };
      }
      if (val === null) {
        return { ok: false, error: 'Value argument must be provided.' };
      }
      // Uses set-value under the hood per v1.1.0 contract
      return await executeAgentDesktop(['set-value', ref, val], 8000);
    }

    case 'desktop_launch': {
      const rawApp = args.app || args.application || args.name || '';
      const appName = String(rawApp).trim().toLowerCase();
      if (!appName) {
        return {
          ok: false,
          error: `Missing application argument. Permitted applications: ${Array.from(PERMITTED_LAUNCH_APPS).join(', ')}.`
        };
      }
      if (!PERMITTED_LAUNCH_APPS.has(appName)) {
        return {
          ok: false,
          error: `Application "${appName}" is not in the whitelist of permitted applications (${Array.from(PERMITTED_LAUNCH_APPS).join(', ')}).`
        };
      }
      const cliArgs = ['launch', appName];
      if (args.activate !== false) {
        cliArgs.push('--activate');
      }
      return await executeAgentDesktop(cliArgs, 45000);
    }

    case 'desktop_list_windows': {
      const cliArgs = ['list-windows'];
      if (args.app && typeof args.app === 'string') {
        const clean = args.app.replace(/[^\w\s.-]/g, '').trim();
        if (clean) cliArgs.push('--app', clean);
      }
      return await executeAgentDesktop(cliArgs, 8000);
    }

    case 'desktop_focus_window': {
      const winId = args.window_id || args.windowId || args.id;
      if (!winId || typeof winId !== 'string') {
        return { ok: false, error: 'window_id argument must be provided.' };
      }
      const clean = winId.replace(/[^\w:-]/g, '').trim();
      return await executeAgentDesktop(['focus-window', clean], 8000);
    }

    case 'desktop_find': {
      const cliArgs = ['find'];
      if (args.app) cliArgs.push('--app', String(args.app).replace(/[^\w\s.-]/g, ''));
      if (args.role) cliArgs.push('--role', String(args.role).replace(/[^\w\s.-]/g, ''));
      if (args.name) cliArgs.push('--name', String(args.name).replace(/[^\w\s.-]/g, ''));
      return await executeAgentDesktop(cliArgs, 10000);
    }

    case 'desktop_get': {
      const ref = args.ref || args['@ref'];
      if (!isValidRef(ref)) {
        return { ok: false, error: `Invalid ref format: "${ref}". Must be @<snapshot_id>:e<number>.` };
      }
      const prop = args.property || args.prop || 'value';
      return await executeAgentDesktop(['get', prop, ref], 8000);
    }

    case 'desktop_is': {
      const ref = args.ref || args['@ref'];
      const condition = args.condition || args.state;
      if (!isValidRef(ref)) {
        return { ok: false, error: `Invalid ref format: "${ref}". Must be @<snapshot_id>:e<number>.` };
      }
      if (!condition) {
        return { ok: false, error: 'condition argument must be provided (e.g. "visible", "enabled", "focused").' };
      }
      return await executeAgentDesktop(['is', String(condition).toLowerCase(), ref], 8000);
    }

    case 'desktop_press': {
      const key = args.key;
      if (!key || typeof key !== 'string') {
        return { ok: false, error: 'key argument must be provided.' };
      }
      const cliArgs = ['press', key.toLowerCase()];
      if (Array.isArray(args.modifiers)) {
        for (const mod of args.modifiers) {
          if (typeof mod === 'string' && ['ctrl', 'alt', 'shift', 'meta'].includes(mod.toLowerCase())) {
            cliArgs.push(`--${mod.toLowerCase()}`);
          }
        }
      }
      return await executeAgentDesktop(cliArgs, 8000);
    }

    case 'desktop_clipboard_get': {
      return await executeAgentDesktop(['clipboard-get'], 5000);
    }

    case 'desktop_clipboard_set': {
      const text = args.text !== undefined ? String(args.text) : '';
      return await executeAgentDesktop(['clipboard-set', text], 5000);
    }

    case 'desktop_status': {
      const versionRes = await executeAgentDesktop(['--version'], 5000);
      const appsRes = await executeAgentDesktop(['list-apps'], 5000);
      return {
        ok: appsRes.ok,
        version: versionRes.raw || 'unknown',
        interactive: appsRes.ok,
        launcher_active: fs.existsSync(LAUNCHER_EXE),
        timestamp: new Date().toISOString()
      };
    }

    default:
      return { ok: false, error: `Unrecognized tool: ${name}` };
  }
}

// MCP JSON-RPC 2.0 stdio framing implementation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result) {
  const payload = {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function sendError(id, code, message) {
  const payload = {
    jsonrpc: '2.0',
    id: id,
    error: { code, message }
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (e) {
    sendError(null, -32700, 'Parse error: invalid JSON');
    return;
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'subbu-desktop-mcp',
            version: '1.0.0'
          }
        });
        break;
      }

      case 'notifications/initialized': {
        // Client ack, no response needed for notifications
        break;
      }

      case 'tools/list': {
        sendResponse(id, {
          tools: TOOLS
        });
        break;
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          sendError(id, -32602, 'Invalid params: missing tool name');
          return;
        }

        const res = await handleToolCall(name, toolArgs || {});
        
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res)
            }
          ],
          isError: res && res.ok === false
        });
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      default:
        if (id !== undefined && id !== null) {
          sendError(id, -32601, `Method not found: ${method}`);
        }
        break;
    }
  } catch (err) {
    if (id !== undefined && id !== null) {
      sendError(id, -32603, `Internal error: ${err.message}`);
    }
  }
});
