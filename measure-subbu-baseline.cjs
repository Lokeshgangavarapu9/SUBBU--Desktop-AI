/**
 * measure-subbu-baseline.cjs
 * Empirical baseline performance measuring tool for SUBBU 2.0.
 * Measures all 15 Phase 1 performance metrics with actual numbers.
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const metrics = {};

function formatBytes(b) {
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

async function run() {
  console.log('================================================================');
  console.log('       SUBBU 2.0 — PHASE 1 PERFORMANCE AUDIT & MEASUREMENT      ');
  console.log('================================================================\n');

  // 1. SYSTEM RESOURCE BASELINE (CPU, RAM, GPU, VRAM)
  console.log('--- Measuring System Hardware & Memory Baseline ---');
  try {
    const osMemRaw = execSync('powershell -NoProfile -Command "$os = Get-CimInstance Win32_OperatingSystem; [math]::Round($os.FreePhysicalMemory/1MB, 2)"', { encoding: 'utf8' }).trim();
    const osTotalRaw = execSync('powershell -NoProfile -Command "$os = Get-CimInstance Win32_OperatingSystem; [math]::Round($os.TotalVisibleMemorySize/1MB, 2)"', { encoding: 'utf8' }).trim();
    metrics.systemRamTotalGB = parseFloat(osTotalRaw);
    metrics.systemRamFreeGB = parseFloat(osMemRaw);
    metrics.systemRamUsedGB = parseFloat((metrics.systemRamTotalGB - metrics.systemRamFreeGB).toFixed(2));
    console.log(`System RAM: ${metrics.systemRamUsedGB} GB used / ${metrics.systemRamTotalGB} GB total (${metrics.systemRamFreeGB} GB free)`);
  } catch (e) {
    metrics.systemRamError = e.message;
  }

  // GPU & VRAM via nvidia-smi
  try {
    const smiRaw = execSync('nvidia-smi --query-gpu=memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf8' }).trim();
    const [vramTotal, vramUsed, vramFree, gpuUtil] = smiRaw.split(',').map(s => parseFloat(s.trim()));
    metrics.vramTotalMB = vramTotal;
    metrics.vramUsedMB = vramUsed;
    metrics.vramFreeMB = vramFree;
    metrics.gpuUtilizationPct = gpuUtil;
    console.log(`NVIDIA GPU VRAM: ${vramUsed} MB used / ${vramTotal} MB total | GPU Util: ${gpuUtil}%`);
  } catch (e) {
    console.log('nvidia-smi error:', e.message);
  }

  // Process Count & Duplicate Check
  try {
    const procRaw = execSync('powershell -NoProfile -Command "(Get-Process).Count"', { encoding: 'utf8' }).trim();
    metrics.totalActiveProcesses = parseInt(procRaw, 10);
    
    const nodeProcsRaw = execSync('powershell -NoProfile -Command "(Get-Process -Name node -ErrorAction SilentlyContinue).Count"', { encoding: 'utf8' }).trim();
    metrics.nodeProcessCount = parseInt(nodeProcsRaw, 10) || 0;

    const openclawProcsRaw = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*openclaw*\' }).Count"', { encoding: 'utf8' }).trim();
    metrics.openclawProcessCount = parseInt(openclawProcsRaw, 10) || 0;

    console.log(`Total Windows Processes: ${metrics.totalActiveProcesses} | Node Processes: ${metrics.nodeProcessCount} | OpenClaw Processes: ${metrics.openclawProcessCount}`);
  } catch (e) {
    console.log('Process check error:', e.message);
  }

  // 2. VITE FRONTEND STARTUP & SERVE SPEED
  console.log('\n--- Measuring Frontend Server Response Time ---');
  const t0 = Date.now();
  try {
    const res = await fetch('http://127.0.0.1:5173/');
    metrics.frontendResponseMs = Date.now() - t0;
    metrics.frontendHttpOk = res.ok;
    console.log(`Frontend (port 5173) Response Time: ${metrics.frontendResponseMs} ms (HTTP ${res.status})`);
  } catch (e) {
    metrics.frontendResponseMs = -1;
    metrics.frontendHttpOk = false;
    console.log('Frontend check failed:', e.message);
  }

  // 3. VRM MODEL ASSET LOAD TIME MEASUREMENT
  console.log('\n--- Measuring VRM Character Model Loading ---');
  const modelPath = path.resolve(__dirname, 'public/models/AvatarSample_B.vrm');
  if (fs.existsSync(modelPath)) {
    const stat = fs.statSync(modelPath);
    metrics.vrmFileSizeBytes = stat.size;
    metrics.vrmFileSizeMB = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`VRM Avatar Size on Disk: ${metrics.vrmFileSizeMB} MB (${metrics.vrmFileSizeBytes} bytes)`);

    // Measure fetch time from local Vite server
    try {
      const tFetchStart = Date.now();
      const vrmRes = await fetch('http://127.0.0.1:5173/models/AvatarSample_B.vrm');
      const buf = await vrmRes.arrayBuffer();
      metrics.vrmFetchDurationMs = Date.now() - tFetchStart;
      metrics.vrmFetchByteLength = buf.byteLength;
      console.log(`VRM Network Buffer Fetch Duration: ${metrics.vrmFetchDurationMs} ms (size: ${formatBytes(buf.byteLength)})`);
    } catch (e) {
      metrics.vrmFetchDurationMs = -1;
      console.log('VRM fetch error:', e.message);
    }
  }

  // 4. OPENCLAW GATEWAY CONNECTION & RESPONSE TIME
  console.log('\n--- Measuring OpenClaw Gateway Connection & Ping ---');
  const tGwStart = Date.now();
  try {
    const gwPing = await new Promise((resolve) => {
      const ws = new WebSocket('ws://127.0.0.1:18789');
      let done = false;
      const tm = setTimeout(() => {
        if (!done) { done = true; try { ws.close(); } catch(_) {} resolve({ ok: false, error: 'Timeout' }); }
      }, 3000);
      ws.onopen = () => {
        if (!done) {
          done = true;
          clearTimeout(tm);
          const lat = Date.now() - tGwStart;
          try { ws.close(); } catch(_) {}
          resolve({ ok: true, latencyMs: lat });
        }
      };
      ws.onerror = (err) => {
        if (!done) { done = true; clearTimeout(tm); resolve({ ok: false, error: err.message }); }
      };
    });
    metrics.openclawConnectionMs = gwPing.latencyMs || -1;
    metrics.openclawOk = gwPing.ok;
    console.log(`OpenClaw Gateway WebSocket Latency: ${metrics.openclawConnectionMs} ms (Connected: ${gwPing.ok})`);
  } catch (e) {
    metrics.openclawConnectionMs = -1;
    metrics.openclawOk = false;
    console.log('OpenClaw error:', e.message);
  }

  // 5. OLLAMA INFERENCE, TIME TO FIRST TOKEN & SPEED
  console.log('\n--- Measuring Ollama Inference & TTFT ---');
  try {
    const testPrompt = 'Say exactly: SUBBU IS ACCELERATED.';
    const tAiStart = Date.now();
    let ttftMs = null;
    let tokens = 0;
    let fullText = '';

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5:2b-q4_K_M',
        prompt: testPrompt,
        stream: true,
        options: {
          num_predict: 64,
          temperature: 0.1
        }
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (ttftMs === null && (parsed.response || parsed.thinking)) {
            ttftMs = Date.now() - tAiStart;
          }
          if (parsed.response) {
            fullText += parsed.response;
            tokens++;
          }
          if (parsed.eval_count) {
            metrics.ollamaEvalCount = parsed.eval_count;
            metrics.ollamaEvalDurationMs = Math.round(parsed.eval_duration / 1e6);
            metrics.ollamaTokensPerSec = parseFloat((parsed.eval_count / (parsed.eval_duration / 1e9)).toFixed(1));
          }
        } catch (_) {}
      }
    }

    metrics.totalAiTimeMs = Date.now() - tAiStart;
    metrics.timeToFirstTokenMs = ttftMs || metrics.totalAiTimeMs;
    console.log(`Time to First Token (TTFT): ${metrics.timeToFirstTokenMs} ms`);
    console.log(`Total Inference Duration: ${metrics.totalAiTimeMs} ms`);
    console.log(`Generation Speed: ${metrics.ollamaTokensPerSec || 'N/A'} tokens/sec`);
    console.log(`Evaluated Tokens: ${metrics.ollamaEvalCount || tokens}`);
  } catch (e) {
    metrics.ollamaError = e.message;
    console.log('Ollama inference error:', e.message);
  }

  // 6. BROWSER AUTOMATION TIME
  console.log('\n--- Measuring Agent Desktop Snapshot Time ---');
  try {
    const { AgentDesktopNodeClient } = require('./integrations/agent-desktop/adapter');
    const client = new AgentDesktopNodeClient();
    const tSnapStart = Date.now();
    const snap = await client.snapshot({ skeleton: true, interactive_only: true });
    metrics.desktopSnapshotMs = Date.now() - tSnapStart;
    metrics.desktopSnapshotOk = snap.ok;
    console.log(`Agent Desktop Snapshot Duration: ${metrics.desktopSnapshotMs} ms (Success: ${snap.ok})`);
  } catch (e) {
    metrics.desktopSnapshotMs = -1;
    console.log('Desktop snapshot error:', e.message);
  }

  // Write baseline output
  fs.writeFileSync(
    path.resolve(__dirname, 'SUBBU_PERFORMANCE_BASELINE.json'),
    JSON.stringify(metrics, null, 2),
    'utf8'
  );
  console.log('\nBaseline metrics written to SUBBU_PERFORMANCE_BASELINE.json');
}

run();

