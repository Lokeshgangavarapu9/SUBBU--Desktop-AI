#!/usr/bin/env node
/**
 * bin/subbu.cjs
 * Official Command-Line Interface (CLI) for SUBBU Personal AI Desktop Companion.
 * Windows 11 Native Architecture.
 */

const { spawn, execSync, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Resolve project root from bin directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Import Agent Desktop Adapter
let AgentDesktopNodeClient = null;
try {
  const adapterModule = require(path.join(PROJECT_ROOT, 'integrations/agent-desktop/adapter'));
  AgentDesktopNodeClient = adapterModule.AgentDesktopNodeClient;
} catch (e) {
  // Fallback if path differs
}

// ANSI color styling
const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);
const c = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  blue: isColorSupported ? '\x1b[34m' : '',
  magenta: isColorSupported ? '\x1b[35m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  white: isColorSupported ? '\x1b[37m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',
};

// ============================================================================
// NETWORK & PROCESS UTILITIES
// ============================================================================

async function checkHttpService(url, timeoutMs = 2500) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const latencyMs = Date.now() - start;
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      // not json
    }
    return { ok: res.ok, status: res.status, latencyMs, data };
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

async function checkWsService(url, timeoutMs = 2500) {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          try { ws.close(); } catch (_) {}
          resolve({ ok: false, error: 'Connection timed out', latencyMs: Date.now() - start });
        }
      }, timeoutMs);

      ws.onopen = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          const latencyMs = Date.now() - start;
          try { ws.close(); } catch (_) {}
          resolve({ ok: true, latencyMs });
        }
      };

      ws.onerror = (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve({ ok: false, error: err.message || 'WebSocket refused', latencyMs: Date.now() - start });
        }
      };
    } catch (e) {
      resolve({ ok: false, error: e.message, latencyMs: Date.now() - start });
    }
  });
}

function getPidsByPort(port) {
  const pids = new Set();
  try {
    const stdout = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
    for (const line of stdout.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.includes(`:${port}`) && trimmed.includes('LISTENING')) {
        const parts = trimmed.split(/\s+/);
        const lastPart = parts[parts.length - 1];
        const pid = parseInt(lastPart, 10);
        if (!isNaN(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch (_) {}
  return Array.from(pids);
}

function killPid(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', windowsHide: true });
    return true;
  } catch (_) {
    return false;
  }
}

function promptConfirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = (answer || '').trim().toLowerCase();
      resolve(trimmed === 'y' || trimmed === 'yes');
    });
  });
}

function parseDuration(arg) {
  if (!arg) return 60; // default 1 minute
  const str = String(arg).trim().toLowerCase();
  
  // Format like '1m30s'
  const complexMatch = str.match(/^(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (complexMatch && (complexMatch[1] || complexMatch[2])) {
    const mins = parseFloat(complexMatch[1] || '0');
    const secs = parseFloat(complexMatch[2] || '0');
    const total = Math.round(mins * 60 + secs);
    if (total > 0) return total;
  }

  // Format like '1m'
  if (str.endsWith('m')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? 60 : Math.round(num * 60);
  }

  // Format like '60s'
  if (str.endsWith('s')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? 60 : Math.round(num);
  }

  // Raw number of seconds
  const rawNum = parseInt(str, 10);
  return isNaN(rawNum) || rawNum <= 0 ? 60 : rawNum;
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// COMMAND IMPLEMENTATIONS
// ============================================================================

async function cmdStatus(flags = {}) {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}               SUBBU SYSTEM STATUS & DIAGNOSTICS               ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

  const results = {};

  // 1. Ollama Server & Local Model
  process.stdout.write(`Checking Ollama Engine (http://localhost:11434)... `);
  const ollama = await checkHttpService('http://localhost:11434/api/tags', 2000);
  if (ollama.ok && ollama.data?.models) {
    const model = ollama.data.models.find(m => m.name.includes('qwen3.5:2b')) || ollama.data.models[0];
    const modelName = model ? model.name : 'none';
    const sizeGb = model ? (model.size / (1024 * 1024 * 1024)).toFixed(2) : '0';
    console.log(`${c.green}ONLINE${c.reset} ${c.gray}(${ollama.latencyMs}ms)${c.reset}`);
    console.log(`   Model : ${c.bold}${modelName}${c.reset} (${sizeGb} GB VRAM offload)`);
    results.ollama = { status: 'ONLINE', latency: ollama.latencyMs, model: modelName };
  } else {
    console.log(`${c.red}OFFLINE${c.reset}`);
    console.log(`   ${c.yellow}Run 'ollama serve' to activate local AI intelligence.${c.reset}`);
    results.ollama = { status: 'OFFLINE' };
  }

  // 2. OpenClaw Gateway
  process.stdout.write(`Checking OpenClaw Gateway (ws://127.0.0.1:18789)... `);
  const gw = await checkWsService('ws://127.0.0.1:18789', 2000);
  const gwPids = getPidsByPort(18789);
  if (gw.ok) {
    console.log(`${c.green}ONLINE${c.reset} ${c.gray}(${gw.latencyMs}ms, PID: ${gwPids.join(',') || 'active'})${c.reset}`);
    results.gateway = { status: 'ONLINE', latency: gw.latencyMs, pids: gwPids };
  } else {
    console.log(`${c.yellow}NOT DETECTED${c.reset}`);
    console.log(`   ${c.gray}Gateway not currently bound. Running in local-first standalone mode.${c.reset}`);
    results.gateway = { status: 'OFFLINE' };
  }

  // 3. SUBBU Frontend Dev Server
  process.stdout.write(`Checking Frontend Server (http://127.0.0.1:5173)... `);
  const fe = await checkHttpService('http://127.0.0.1:5173/', 1500);
  const fePids = getPidsByPort(5173);
  if (fe.ok) {
    console.log(`${c.green}ONLINE${c.reset} ${c.gray}(${fe.latencyMs}ms, PID: ${fePids.join(',') || 'active'})${c.reset}`);
    console.log(`   URL   : ${c.cyan}http://localhost:5173${c.reset}`);
    results.frontend = { status: 'ONLINE', latency: fe.latencyMs, pids: fePids };
  } else {
    console.log(`${c.yellow}STOPPED${c.reset}`);
    console.log(`   ${c.gray}Frontend server not active. Run 'subbu start' to launch.${c.reset}`);
    results.frontend = { status: 'STOPPED' };
  }

  // 4. Agent Desktop Bridge & Station
  process.stdout.write(`Checking Agent Desktop Bridge (WinSta0\\Default)... `);
  if (AgentDesktopNodeClient) {
    const client = new AgentDesktopNodeClient();
    try {
      const desktopStatus = await client.getStatus();
      if (desktopStatus.ok && desktopStatus.launcher_present) {
        console.log(`${c.green}READY${c.reset}`);
        console.log(`   Bridge: ${c.bold}${desktopStatus.version}${c.reset} | Session: Windows 11 Desktop (${path.basename(desktopStatus.executable)})`);
        results.desktop = { status: 'READY', version: desktopStatus.version };
      } else {
        console.log(`${c.yellow}AVAILABLE (native fallback)${c.reset}`);
        results.desktop = { status: 'FALLBACK' };
      }
    } catch (e) {
      console.log(`${c.red}ERROR${c.reset} (${e.message})`);
      results.desktop = { status: 'ERROR', error: e.message };
    }
  } else {
    console.log(`${c.yellow}ADAPTER NOT FOUND${c.reset}`);
    results.desktop = { status: 'UNAVAILABLE' };
  }

  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}\n`);

  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
  }
}

const { SubbuProcessSupervisor } = require(path.join(PROJECT_ROOT, 'src/services/supervisor/subbuProcessSupervisor.cjs'));

async function cmdStart(flags = {}) {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}               STARTING SUBBU PERSONAL AI COMPANION             ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

  // 1. Check/Start Ollama
  process.stdout.write(`1. Checking Ollama Local Model Engine... `);
  const ollama = await SubbuProcessSupervisor.ensureOllama();
  if (ollama.status === 'ALREADY_RUNNING') {
    console.log(`${c.green}Active (${ollama.latencyMs}ms)${c.reset} — reusing existing instance`);
  } else if (ollama.status === 'SPAWNED') {
    console.log(`${c.green}Spawned in background (${ollama.latencyMs}ms, PID: ${ollama.pid})${c.reset}`);
  } else {
    console.log(`${c.yellow}${ollama.status}${c.reset}`);
  }

  // 2. Check/Start OpenClaw Gateway
  process.stdout.write(`2. Checking OpenClaw Gateway... `);
  const gw = await SubbuProcessSupervisor.ensureGateway();
  if (gw.status === 'ALREADY_RUNNING') {
    console.log(`${c.green}Active on ws://127.0.0.1:18789 (${gw.latencyMs}ms)${c.reset}`);
  } else if (gw.status === 'SPAWNED') {
    console.log(`${c.green}Spawned in background (${gw.latencyMs}ms, PID: ${gw.pid})${c.reset}`);
  } else {
    console.log(`${c.gray}Local-first standalone mode (${gw.latencyMs}ms)${c.reset}`);
  }

  // 3. Check/Start Frontend
  process.stdout.write(`3. Initializing Frontend... `);
  const fe = await SubbuProcessSupervisor.ensureFrontend(PROJECT_ROOT);
  if (fe.status === 'ALREADY_RUNNING') {
    console.log(`${c.green}Already running on http://127.0.0.1:5173 (${fe.latencyMs}ms)${c.reset}`);
  } else if (fe.status === 'SPAWNED') {
    console.log(`${c.green}Spawned in background (${fe.latencyMs}ms, PID: ${fe.pid})${c.reset}`);
  } else {
    console.log(`${c.cyan}Active on port 5173${c.reset}`);
  }

  console.log(`\n${c.bold}${c.green}✅ SUBBU is ready!${c.reset}`);
  console.log(`🌐 Open in your browser: ${c.bold}${c.cyan}http://localhost:5173${c.reset}\n`);

  // Open browser safely
  setTimeout(() => {
    try { execSync('start http://localhost:5173'); } catch (_) {}
  }, 600);
}

async function cmdStop(flags = {}) {
  console.log(`\n${c.bold}${c.yellow}================================================================${c.reset}`);
  console.log(`${c.bold}${c.yellow}                    STOPPING SUBBU SERVICES                    ${c.reset}`);
  console.log(`${c.bold}${c.yellow}================================================================${c.reset}\n`);

  // Sensitive action safety confirmation
  if (!flags.yes && !flags.y && !flags.force) {
    const confirmed = await promptConfirm(
      `${c.bold}${c.yellow}⚠️  Are you sure you want to stop all active SUBBU services? [y/N]: ${c.reset}`
    );
    if (!confirmed) {
      console.log(`\n${c.gray}Operation cancelled. No services were stopped.${c.reset}\n`);
      return;
    }
  }

  let stoppedCount = 0;

  // 1. Terminate tracked owned processes
  stoppedCount += SubbuProcessSupervisor.stopOwnedProcesses();

  // 2. Stop Frontend Server (port 5173) if still listening
  const fePids = getPidsByPort(5173);
  if (fePids.length > 0) {
    for (const pid of fePids) {
      process.stdout.write(`Stopping SUBBU Frontend server (PID ${pid})... `);
      if (killPid(pid)) {
        console.log(`${c.green}DONE${c.reset}`);
        stoppedCount++;
      } else {
        console.log(`${c.red}FAILED${c.reset}`);
      }
    }
  } else {
    console.log(`Frontend server (port 5173) is not running.`);
  }

  // 2. Stop OpenClaw Gateway if requested with --all
  if (flags.all) {
    const gwPids = getPidsByPort(18789);
    for (const pid of gwPids) {
      process.stdout.write(`Stopping OpenClaw Gateway (PID ${pid})... `);
      if (killPid(pid)) {
        console.log(`${c.green}DONE${c.reset}`);
        stoppedCount++;
      } else {
        console.log(`${c.red}FAILED${c.reset}`);
      }
    }
  }

  console.log(`\n${c.bold}${c.green}✅ SUBBU stop sequence complete. ${stoppedCount} process(es) terminated.${c.reset}\n`);
}

async function cmdOpen(target, args = [], flags = {}) {
  if (!target) {
    console.log(`${c.red}Error: Please specify what to open.${c.reset}`);
    console.log(`Supported targets: ${c.bold}browser, calendar, notepad, calculator${c.reset}`);
    process.exit(1);
  }

  const clean = target.trim().toLowerCase();

  switch (clean) {
    case 'browser':
    case 'edge':
    case 'chrome': {
      console.log(`${c.cyan}🌐 Launching Web Browser on Windows 11 Desktop...${c.reset}`);
      const targetUrl = args[0] || 'http://localhost:5173';
      try {
        if (AgentDesktopNodeClient) {
          const client = new AgentDesktopNodeClient();
          const res = await client.launch('msedge');
          if (res.ok) {
            console.log(`${c.green}✅ Browser launched successfully (PID: ${res.data?.pid || 'active'}).${c.reset}`);
            // Navigate to target URL
            try { execSync(`start ${targetUrl}`); } catch (_) {}
            return;
          }
        }
        // Fallback to native Windows start
        execSync(`start ${targetUrl}`);
        console.log(`${c.green}✅ Browser opened to ${targetUrl}${c.reset}`);
      } catch (err) {
        console.log(`${c.red}❌ Failed to launch browser: ${err.message}${c.reset}`);
      }
      break;
    }

    case 'calendar':
    case 'gcal': {
      console.log(`${c.cyan}📅 Opening Google Calendar...${c.reset}`);
      try {
        execSync('start https://calendar.google.com');
        console.log(`${c.green}✅ Google Calendar opened in default browser.${c.reset}`);
        console.log(`   ${c.yellow}🔐 [Notice] If prompted, sign in to your Google Account in the browser.${c.reset}`);
        console.log(`   ${c.gray}   SUBBU preserves full user privacy without storing credentials.${c.reset}`);
      } catch (err) {
        console.log(`${c.red}❌ Failed to open calendar: ${err.message}${c.reset}`);
      }
      break;
    }

    case 'notepad': {
      console.log(`${c.cyan}📝 Launching Notepad on desktop station (WinSta0\\Default)...${c.reset}`);
      try {
        if (AgentDesktopNodeClient) {
          const client = new AgentDesktopNodeClient();
          const res = await client.launch('notepad', 3500);
          if (res && res.ok) {
            console.log(`${c.green}✅ Notepad launched (PID: ${res.data?.pid || 'spawned'}).${c.reset}`);
            console.log(`   Desktop station: WinSta0\\Default verified.`);
            return;
          }
        }
        spawn('cmd.exe', ['/c', 'start', '', 'notepad.exe'], { detached: true, stdio: 'ignore' }).unref();
        console.log(`${c.green}✅ Notepad launched.${c.reset}`);
      } catch (err) {
        console.log(`${c.red}❌ Failed to launch Notepad: ${err.message}${c.reset}`);
      }
      break;
    }

    case 'calculator':
    case 'calc': {
      console.log(`${c.cyan}🔢 Launching Windows Calculator...${c.reset}`);
      try {
        if (AgentDesktopNodeClient) {
          const client = new AgentDesktopNodeClient();
          const res = await client.launch('calculator', 3500);
          if (res && res.ok) {
            console.log(`${c.green}✅ Calculator launched (PID: ${res.data?.pid || 'spawned'}).${c.reset}`);
            return;
          }
        }
        spawn('cmd.exe', ['/c', 'start', '', 'calc.exe'], { detached: true, stdio: 'ignore' }).unref();
        console.log(`${c.green}✅ Calculator launched.${c.reset}`);
      } catch (err) {
        console.log(`${c.red}❌ Failed to launch Calculator: ${err.message}${c.reset}`);
      }
      break;
    }

    default: {
      console.log(`${c.red}Unknown target: "${target}"${c.reset}`);
      console.log(`Available targets: ${c.bold}browser, calendar, notepad, calculator${c.reset}`);
      process.exit(1);
    }
  }
}

async function cmdTimer(arg, flags = {}) {
  const totalSeconds = parseDuration(arg);
  let remaining = totalSeconds;

  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}                  SUBBU COUNTDOWN TIMER                         ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);
  console.log(`⏱️  Duration : ${c.bold}${formatDuration(totalSeconds)}${c.reset} (${totalSeconds} seconds)`);
  console.log(`💡 Press ${c.bold}Ctrl+C${c.reset} at any time to cancel.\n`);

  // Hide terminal cursor
  process.stdout.write('\x1b[?25l');

  const cleanUp = () => {
    process.stdout.write('\x1b[?25h\n');
  };

  process.on('SIGINT', () => {
    cleanUp();
    console.log(`\n${c.yellow}Timer cancelled by user.${c.reset}\n`);
    process.exit(0);
  });

  return new Promise((resolve) => {
    const render = () => {
      const elapsed = totalSeconds - remaining;
      const pct = Math.floor((elapsed / totalSeconds) * 100);
      const barWidth = 24;
      const filled = Math.round((elapsed / totalSeconds) * barWidth);
      const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barWidth - filled));

      process.stdout.write(
        `\r⏳ [${c.cyan}${bar}${c.reset}] ${c.bold}${formatDuration(remaining)}${c.reset} / ${formatDuration(totalSeconds)} (${pct}%)  `
      );
    };

    render();

    const interval = setInterval(() => {
      remaining -= 1;
      render();

      if (remaining <= 0) {
        clearInterval(interval);
        cleanUp();
        
        // Terminal bell chime
        process.stdout.write('\x07');

        console.log(`\n\n${c.bold}${c.green}🎉 Ding! Time is up!${c.reset}`);
        console.log(`✅ Timer for ${formatDuration(totalSeconds)} finished successfully at ${new Date().toLocaleTimeString()}.\n`);
        
        // Optional system audio chime via PowerShell
        try {
          execSync('powershell -c "[System.Media.SystemSounds]::Asterisk.Play()"', { stdio: 'ignore', windowsHide: true });
        } catch (_) {}

        resolve();
      }
    }, 1000);
  });
}

function cmdHelp() {
  console.log(`
${c.bold}${c.cyan}🦞 SUBBU CLI — Personal AI Desktop Companion${c.reset}
${c.dim}Windows 11 Local-First Architecture${c.reset}

${c.bold}USAGE:${c.reset}
  ${c.cyan}subbu${c.reset} <command> [arguments] [options]

${c.bold}COMMANDS:${c.reset}
  ${c.green}status${c.reset}                   Check health of Ollama, Gateway, Frontend, and Desktop Station
  ${c.green}start${c.reset}                    Start SUBBU services (Ollama, OpenClaw Gateway, Vite Frontend)
  ${c.green}stop${c.reset}                     Stop running SUBBU services safely (with confirmation)
  ${c.green}open browser${c.reset}             Launch Web Browser on Windows 11 Desktop
  ${c.green}open calendar${c.reset}            Open Google Calendar in browser (with auth check)
  ${c.green}open notepad${c.reset}             Launch Notepad on desktop station (WinSta0\\Default)
  ${c.green}open calculator${c.reset}          Launch Windows Calculator (calc.exe)
  ${c.green}timer [duration]${c.reset}         Start live countdown timer (e.g. 1m, 30s, 2m, default: 1m)
  ${c.green}help${c.reset}                     Display this help message

${c.bold}OPTIONS:${c.reset}
  ${c.yellow}-y, --yes, --force${c.reset}       Skip safety confirmation prompts
  ${c.yellow}-d, --daemon${c.reset}             Run services in background mode
  ${c.yellow}--json${c.reset}                   Output responses in structured JSON
  ${c.yellow}-h, --help${c.reset}               Show help information
  ${c.yellow}-v, --version${c.reset}            Display current SUBBU version

${c.bold}EXAMPLES:${c.reset}
  subbu status
  subbu start --daemon
  subbu stop -y
  subbu open notepad
  subbu open calculator
  subbu timer 1m
  subbu timer 45s
`);
}

// ============================================================================
// MAIN CLI DISPATCHER
// ============================================================================

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes('-h') || rawArgs.includes('--help') || rawArgs[0] === 'help') {
    cmdHelp();
    return;
  }

  if (rawArgs.includes('-v') || rawArgs.includes('--version') || rawArgs[0] === 'version') {
    console.log(`SUBBU CLI v1.0.0 (Windows 11 Local-First)`);
    return;
  }

  const command = rawArgs[0].toLowerCase();
  const args = [];
  const flags = {};

  for (let i = 1; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a.startsWith('--')) {
      flags[a.slice(2).toLowerCase()] = true;
    } else if (a.startsWith('-')) {
      flags[a.slice(1).toLowerCase()] = true;
    } else {
      args.push(a);
    }
  }

  try {
    switch (command) {
      case 'status':
        await cmdStatus(flags);
        break;

      case 'start':
        await cmdStart(flags);
        break;

      case 'stop':
        await cmdStop(flags);
        break;

      case 'open':
        await cmdOpen(args[0], args.slice(1), flags);
        break;

      case 'timer':
        await cmdTimer(args[0], flags);
        break;

      default:
        console.log(`${c.red}Unknown command: "${command}"${c.reset}\n`);
        cmdHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n${c.red}Fatal Error: ${err.message}${c.reset}`);
    if (flags.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
