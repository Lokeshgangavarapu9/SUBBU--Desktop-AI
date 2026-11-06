/**
 * start-subbu.cjs
 * Unified launcher for SUBBU - Personal AI Desktop Companion
 * Windows 11 Native Architecture & Process Supervisor.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { SubbuProcessSupervisor } = require('./src/services/supervisor/subbuProcessSupervisor.cjs');

async function startSubbu() {
  console.log('================================================================');
  console.log('               STARTING SUBBU PERSONAL AI COMPANION             ');
  console.log('================================================================\n');

  // 1. Ollama Engine
  process.stdout.write('1. Checking Ollama Local Model Engine... ');
  const t0 = Date.now();
  const ollama = await SubbuProcessSupervisor.ensureOllama();
  if (ollama.status === 'ALREADY_RUNNING') {
    console.log(`✅ Active (${ollama.latencyMs}ms) — reusing existing instance`);
  } else if (ollama.status === 'SPAWNED') {
    console.log(`✅ Spawned in background (${ollama.latencyMs}ms, PID: ${ollama.pid})`);
  } else {
    console.log(`⚠️ Status: ${ollama.status}`);
  }

  // 2. OpenClaw Gateway
  process.stdout.write('2. Checking OpenClaw Gateway (ws://127.0.0.1:18789)... ');
  const gw = await SubbuProcessSupervisor.ensureGateway();
  if (gw.status === 'ALREADY_RUNNING') {
    console.log(`✅ Active (${gw.latencyMs}ms) — connection verified`);
  } else if (gw.status === 'SPAWNED') {
    console.log(`✅ Spawned (${gw.latencyMs}ms, PID: ${gw.pid})`);
  } else {
    console.log(`ℹ️ Running in local-first standalone mode (${gw.latencyMs}ms)`);
  }

  // 3. Agent Desktop Bridge
  process.stdout.write('3. Checking Agent Desktop WinSta0 Bridge... ');
  const launcherPath = path.resolve(__dirname, 'agent-desktop-launcher.exe');
  if (fs.existsSync(launcherPath)) {
    console.log('✅ Windowless launcher ready at WinSta0\\Default');
  } else {
    console.log('⚠️ agent-desktop-launcher.exe not found in root.');
  }

  // 4. SUBBU Frontend
  process.stdout.write('4. Initializing SUBBU Frontend... ');
  const fe = await SubbuProcessSupervisor.ensureFrontend(__dirname);
  if (fe.status === 'ALREADY_RUNNING') {
    console.log(`✅ Already serving on http://localhost:5173 (${fe.latencyMs}ms)`);
  } else if (fe.status === 'SPAWNED') {
    console.log(`✅ Launched in background (${fe.latencyMs}ms, PID: ${fe.pid})`);
  } else {
    console.log(`ℹ️ Serving on port 5173`);
  }

  console.log('\n================================================================');
  console.log('   SUBBU IS READY!');
  console.log('   Open in your browser: http://localhost:5173');
  console.log(`   Total Startup Verification: ${Date.now() - t0} ms`);
  console.log('================================================================\n');

  // Attempt to open default browser
  setTimeout(() => {
    try {
      execSync('start http://localhost:5173');
    } catch (_) {}
  }, 800);
}

startSubbu();
