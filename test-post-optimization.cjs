const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');

async function measurePostOptimization() {
  const results = {
    timestamp: new Date().toISOString(),
    metrics: {}
  };

  console.log('--- SUBBU 2.0 Post-Optimization Benchmarking ---');

  // 1. Measure Vite bundle chunking
  const distPath = 'dist/assets';
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    let totalSize = 0;
    const chunks = {};
    for (const file of files) {
      const stat = fs.statSync(`${distPath}/${file}`);
      totalSize += stat.size;
      chunks[file] = (stat.size / 1024).toFixed(1) + ' KB';
    }
    results.metrics.bundle = {
      totalSizeKB: (totalSize / 1024).toFixed(1),
      chunks
    };
    console.log(`Bundle total size: ${(totalSize / 1024).toFixed(1)} KB`);
  }

  // 2. Warm TTFT and generation speed with tuned num_ctx & num_predict
  console.log('Testing Warm Ollama TTFT & Token Speed...');
  const prompt = "Say 'Hello Lokesh, Subbu 2.0 is fully operational!' in one sentence.";
  const payload = JSON.stringify({
    model: "qwen3.5:2b-q4_K_M",
    prompt: prompt,
    system: "You are SUBBU, an ultra-fast desktop assistant. Respond immediately and concisely.",
    stream: true,
    options: {
      num_predict: 256,
      num_ctx: 2048,
      temperature: 0.2
    },
    keep_alive: "30m"
  });

  const tStart = Date.now();
  let firstTokenTime = null;
  let thinkingTokens = 0;
  let responseTokens = 0;
  let fullResponse = '';
  let fullThinking = '';

  await new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (!firstTokenTime && (data.thinking || data.response)) {
              firstTokenTime = Date.now();
            }
            if (data.thinking) {
              thinkingTokens++;
              fullThinking += data.thinking;
            }
            if (data.response) {
              responseTokens++;
              fullResponse += data.response;
            }
            if (data.done) {
              resolve();
            }
          } catch (e) {}
        }
      });
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const tEnd = Date.now();
  const ttftMs = firstTokenTime ? (firstTokenTime - tStart) : (tEnd - tStart);
  const totalTokens = thinkingTokens + responseTokens;
  const genDurationSec = (tEnd - (firstTokenTime || tStart)) / 1000;
  const tokensPerSec = genDurationSec > 0 ? (totalTokens / genDurationSec).toFixed(1) : 'N/A';

  results.metrics.ollamaWarm = {
    ttftMs,
    totalDurationMs: tEnd - tStart,
    thinkingTokens,
    responseTokens,
    totalTokens,
    tokensPerSec,
    sampleThinking: fullThinking.trim().slice(0, 100) + '...',
    sampleResponse: fullResponse.trim()
  };

  console.log(`Warm TTFT: ${ttftMs} ms | Speed: ${tokensPerSec} t/s | Tokens: ${totalTokens} (Thinking: ${thinkingTokens}, Response: ${responseTokens})`);
  console.log(`Response: ${fullResponse.trim()}`);

  // 3. Hardware resource snapshot
  try {
    const memOut = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json"', { encoding: 'utf-8' });
    const memData = JSON.parse(memOut);
    const totalGB = (memData.TotalVisibleMemorySize / (1024 * 1024)).toFixed(2);
    const freeGB = (memData.FreePhysicalMemory / (1024 * 1024)).toFixed(2);
    const usedGB = (totalGB - freeGB).toFixed(2);
    results.metrics.systemMemory = { totalGB, usedGB, freeGB, usagePct: ((usedGB / totalGB) * 100).toFixed(1) + '%' };
  } catch (e) {}

  // 4. GPU VRAM via nvidia-smi
  try {
    const smiOut = execSync('nvidia-smi --query-gpu=memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits', { encoding: 'utf-8' });
    const [totalVram, usedVram, freeVram, gpuUtil, temp] = smiOut.trim().split(',').map(s => s.trim());
    results.metrics.gpu = {
      totalVramMiB: totalVram,
      usedVramMiB: usedVram,
      freeVramMiB: freeVram,
      gpuUtilPct: gpuUtil + '%',
      temperatureC: temp + '°C'
    };
  } catch (e) {}

  // 5. Supervisor PID tracking check
  const pidFile = require('path').join(require('os').tmpdir(), 'subbu-runtime-pids.json');
  if (fs.existsSync(pidFile)) {
    results.metrics.supervisorPids = JSON.parse(fs.readFileSync(pidFile, 'utf-8'));
  }

  fs.writeFileSync('SUBBU_POST_OPTIMIZATION_BENCHMARK.json', JSON.stringify(results, null, 2));
  console.log('Saved benchmark results to SUBBU_POST_OPTIMIZATION_BENCHMARK.json');
}

measurePostOptimization().catch(console.error);
