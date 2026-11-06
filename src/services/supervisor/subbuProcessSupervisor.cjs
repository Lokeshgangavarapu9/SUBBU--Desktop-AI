/**
 * src/services/supervisor/subbuProcessSupervisor.cjs
 * Robust Single-Instance Process Supervisor & Diagnostics for SUBBU 2.0.
 * Eliminates duplicate processes, unwanted terminal flashing, and redundant restarts.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PID_FILE = path.join(os.tmpdir(), 'subbu-runtime-pids.json');

function loadTrackedPids() {
  try {
    if (fs.existsSync(PID_FILE)) {
      return JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    }
  } catch (_) {}
  return { vite: null, gateway: null, ollama: null };
}

function saveTrackedPids(pids) {
  try {
    fs.writeFileSync(PID_FILE, JSON.stringify(pids, null, 2), 'utf8');
  } catch (_) {}
}

async function checkHttp(url, timeoutMs = 1500) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start };
  }
}

async function checkWs(url, timeoutMs = 1500) {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      let done = false;
      const t = setTimeout(() => {
        if (!done) {
          done = true;
          try { ws.close(); } catch (_) {}
          resolve({ ok: false, latencyMs: Date.now() - start, error: 'Timed out' });
        }
      }, timeoutMs);

      ws.onopen = () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          try { ws.close(); } catch (_) {}
          resolve({ ok: true, latencyMs: Date.now() - start });
        }
      };

      ws.onerror = (e) => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve({ ok: false, latencyMs: Date.now() - start, error: e.message || 'Refused' });
        }
      };
    } catch (e) {
      resolve({ ok: false, latencyMs: Date.now() - start, error: e.message });
    }
  });
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

class SubbuProcessSupervisor {
  static async ensureOllama() {
    const health = await checkHttp('http://localhost:11434/api/tags', 1200);
    if (health.ok) {
      return { status: 'ALREADY_RUNNING', latencyMs: health.latencyMs };
    }

    // Spawn windowless ollama serve
    const pids = loadTrackedPids();
    const proc = spawn('ollama', ['serve'], {
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();

    pids.ollama = proc.pid;
    saveTrackedPids(pids);

    // Wait up to 3.5s for readiness
    const t0 = Date.now();
    for (let i = 0; i < 7; i++) {
      await new Promise(r => setTimeout(r, 500));
      const verify = await checkHttp('http://localhost:11434/api/tags', 800);
      if (verify.ok) {
        return { status: 'SPAWNED', pid: proc.pid, latencyMs: Date.now() - t0 };
      }
    }
    return { status: 'SPAWN_TIMEOUT', pid: proc.pid };
  }

  static async ensureGateway() {
    const health = await checkWs('ws://127.0.0.1:18789', 1200);
    if (health.ok) {
      return { status: 'ALREADY_RUNNING', latencyMs: health.latencyMs };
    }

    const pids = loadTrackedPids();
    // Only spawn if not already running
    const proc = spawn('openclaw', ['gateway', 'run'], {
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    proc.unref();

    pids.gateway = proc.pid;
    saveTrackedPids(pids);

    const t0 = Date.now();
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 500));
      const verify = await checkWs('ws://127.0.0.1:18789', 800);
      if (verify.ok) {
        return { status: 'SPAWNED', pid: proc.pid, latencyMs: Date.now() - t0 };
      }
    }
    return { status: 'STANDALONE_LOCAL_MODE', latencyMs: Date.now() - t0 };
  }

  static async ensureFrontend(projectRoot) {
    const health = await checkHttp('http://127.0.0.1:5173/', 1000);
    if (health.ok) {
      return { status: 'ALREADY_RUNNING', latencyMs: health.latencyMs };
    }

    const pids = loadTrackedPids();
    const proc = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
      cwd: projectRoot,
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    proc.unref();

    pids.vite = proc.pid;
    saveTrackedPids(pids);

    const t0 = Date.now();
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 500));
      const verify = await checkHttp('http://127.0.0.1:5173/', 600);
      if (verify.ok) {
        return { status: 'SPAWNED', pid: proc.pid, latencyMs: Date.now() - t0 };
      }
    }
    return { status: 'SPAWN_PENDING', pid: proc.pid };
  }

  static stopOwnedProcesses() {
    const pids = loadTrackedPids();
    let count = 0;

    if (pids.vite && isPidAlive(pids.vite)) {
      try {
        execSync(`taskkill /F /T /PID ${pids.vite}`, { stdio: 'ignore', windowsHide: true });
        count++;
      } catch (_) {}
    }

    // Clear tracked
    saveTrackedPids({ vite: null, gateway: null, ollama: null });
    return count;
  }
}

module.exports = {
  SubbuProcessSupervisor,
  loadTrackedPids,
  checkHttp,
  checkWs,
};

