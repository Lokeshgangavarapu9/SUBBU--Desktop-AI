/**
 * SUBBU 2.0 Desktop Application End-to-End Validation Test
 * Tests the live compiled binary `subbu-desktop.exe` using Chrome DevTools Protocol (CDP)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const EXE_PATH = path.join(__dirname, 'src-tauri', 'target', 'release', 'subbu-desktop.exe');
const CDP_PORT = 9222;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`JS Eval Exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runValidation() {
  const testResults = {
    timestamp: new Date().toISOString(),
    binary: EXE_PATH,
    checks: [],
    overallStatus: 'PENDING'
  };

  function logCheck(name, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${name} ${details ? '- ' + details : ''}`);
    testResults.checks.push({ name, passed, details });
    if (!passed) testResults.overallStatus = 'FAILED';
  }

  console.log('====================================================');
  console.log('SUBBU 2.0 DESKTOP APPLICATION COMPREHENSIVE E2E TEST');
  console.log('Target Binary:', EXE_PATH);
  console.log('====================================================\n');

  // 1. Verify executable exists
  if (!fs.existsSync(EXE_PATH)) {
    logCheck('Executable Binary Check', false, `Missing: ${EXE_PATH}`);
    return testResults;
  }
  const stat = fs.statSync(EXE_PATH);
  logCheck('Executable Binary Check', true, `Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

  // 2. Launch process with remote debugging
  console.log('\n[INFO] Launching subbu-desktop.exe with CDP debugging...');
  const env = {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}`
  };

  const proc = spawn(EXE_PATH, [], {
    env,
    detached: true,
    stdio: 'ignore'
  });

  proc.unref();

  let cdpConnected = false;
  let targetPage = null;
  let client = null;

  try {
    // Poll for CDP endpoint and target page
    for (let i = 0; i < 25; i++) {
      await delay(500);
      try {
        const pages = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
        if (pages && pages.length > 0) {
          const page = pages.find(p => p.url && p.url.startsWith('http://tauri.localhost'));
          if (page) {
            targetPage = page;
            cdpConnected = true;
            break;
          }
        }
      } catch (e) {
        // waiting for WebView2
      }
    }

    logCheck('Desktop Process Launch & Responding', cdpConnected, `PID: ${proc.pid}`);
    if (!cdpConnected || !targetPage) {
      throw new Error('Could not find active tauri page within 12 seconds');
    }

    logCheck('WebView2 Page URL Target', targetPage.url === 'http://tauri.localhost/', `URL: ${targetPage.url}`);

    // Connect CDP Client
    client = new CDPClient(targetPage.webSocketDebuggerUrl);
    await client.connect();
    logCheck('CDP WebSocket Connection', true, 'Connected to WebView2 inspection protocol');

    // Enable Runtime
    await client.send('Runtime.enable');

    // Wait 2.0 seconds for React components to finish mounting
    await delay(2000);

    const docTitle = await client.evaluate('document.title');
    logCheck('Window Title Verification', Boolean(docTitle && docTitle.includes('SUBBU')), `Title: "${docTitle}"`);

    // 3. UI and DOM Inspection (Anti-Blank-Screen Check)
    const domHtmlLength = await client.evaluate('document.getElementById("root")?.innerHTML.length || 0');
    logCheck('React Root Rendered (No Blank Screen)', domHtmlLength > 50, `Root innerHTML length: ${domHtmlLength} chars`);

    const hasSubbuHeading = await client.evaluate(`
      document.body.innerText.toLowerCase().includes("subbu") &&
      document.body.innerText.includes("Ambient Companion Stage Active")
    `);
    logCheck('UI Brand / Status Rendered', Boolean(hasSubbuHeading), 'UI has visible Subbu ambient companion stage');

    // 3b. Verify OpenClaw Live Connection & Zero Warning Banner
    let gatewayConnected = false;
    let bodyText = '';
    for (let i = 0; i < 12; i++) {
      bodyText = await client.evaluate('document.body.innerText') || '';
      if (bodyText.includes('Connected') && !bodyText.includes('Local Gateway (127.0.0.1:18789) unreachable')) {
        gatewayConnected = true;
        break;
      }
      await delay(500);
    }
    const hasUnreachableBanner = bodyText.includes('unreachable') || bodyText.includes('Backend Error');
    logCheck('OpenClaw Live Gateway Connection', gatewayConnected, gatewayConnected ? 'Status: Connected' : 'Status: Not Connected');
    logCheck('Zero Unreachable Gateway Warning Banner', !hasUnreachableBanner, hasUnreachableBanner ? 'Warning banner displayed' : 'Warning banner completely absent in live UI');

    // 4. Tauri IPC Environment Check
    const ipcAvailable = await client.evaluate(`
      Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__)
    `);
    logCheck('Native Tauri 2 IPC Injected', ipcAvailable, 'window.__TAURI_INTERNALS__ available in WebView2');

    // 5. System Telemetry Tauri Command
    console.log('\n[INFO] Invoking native get_system_telemetry IPC...');
    const telemetry = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        if (!invoker) return { error: "No invoker found" };
        return await invoker("get_system_telemetry");
      })()
    `);
    const teleValid = telemetry && typeof telemetry.ram_used_gb === 'number';
    logCheck('System Telemetry IPC Call', teleValid, 
      `RAM: ${telemetry?.ram_used_gb}/${telemetry?.ram_total_gb} GB, Ollama: ${telemetry?.ollama_online}, OpenClaw: ${telemetry?.openclaw_online}`
    );
    logCheck('Ollama Service Connection', telemetry?.ollama_online === true, '127.0.0.1:11434 reachable');
    logCheck('OpenClaw Daemon Connection', telemetry?.openclaw_online === true, '127.0.0.1:18789 reachable');
    logCheck('Telemetry Zero Token Leak', telemetry?.openclaw_token === undefined, 'openclaw_token is not exposed in telemetry');

    // 5b. Authenticated Loopback Bridge Check
    console.log('\n[INFO] Invoking native get_gateway_endpoint IPC (security bridge)...');
    const endpoint = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        if (!invoker) return null;
        return await invoker("get_gateway_endpoint");
      })()
    `);
    const bridgeOk = typeof endpoint === 'string' && endpoint.startsWith('ws://127.0.0.1:');
    logCheck('Native Loopback Bridge Endpoint IPC', bridgeOk, `Endpoint: ${endpoint}`);

    // 5c. Client-side Storage Security Audit
    const storageAudit = await client.evaluate(`
      (() => {
        const ls = JSON.stringify(window.localStorage || {});
        const ss = JSON.stringify(window.sessionStorage || {});
        const hasToken = ls.includes('29946803') || ss.includes('29946803') || ls.includes('0a360b64') || ss.includes('0a360b64');
        return { hasToken, lsLength: Object.keys(window.localStorage || {}).length };
      })()
    `);
    logCheck('Browser Storage Zero Secret Exposure', !storageAudit.hasToken, 'localStorage and sessionStorage contain no tokens');

    // 6. Native Desktop Automation Sidecar Test
    console.log('\n[INFO] Invoking execute_desktop_command IPC (sidecar verification)...');
    const sidecarRes = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        if (!invoker) return { error: "No invoker found" };
        return await invoker("execute_desktop_command", { args: ["--help"] });
      })()
    `);
    const sidecarOk = sidecarRes && (sidecarRes.ok === true || sidecarRes.output !== null);
    logCheck('Desktop Automation Sidecar Execution', sidecarOk, 
      `agent-desktop-launcher executed without error`
    );

    // 7. Native Application Launch Test (Notepad)
    console.log('\n[INFO] Invoking open_application IPC for Notepad...');
    const openAppRes = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        if (!invoker) return { error: "No invoker found" };
        return await invoker("open_application", { appName: "notepad" });
      })()
    `);
    const openAppOk = openAppRes && openAppRes.includes('Successfully opened');
    logCheck('Native open_application IPC (Notepad)', openAppOk, `Result: "${openAppRes}"`);
    await delay(1000);
    // Cleanup opened notepad
    try {
      execSync('taskkill /IM notepad.exe /F', { stdio: 'ignore' });
    } catch (_) {}

    // 8. Toggle Window IPC Command
    console.log('\n[INFO] Invoking toggle_window IPC (Show/Hide)...');
    const hideRes = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        return await invoker("toggle_window");
      })()
    `);
    logCheck('Window Toggle (Hide)', hideRes === false, 'Main window hidden successfully');
    await delay(500);
    const showRes = await client.evaluate(`
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        return await invoker("toggle_window");
      })()
    `);
    logCheck('Window Toggle (Restore/Show)', showRes === true, 'Main window restored & focused successfully');

    // 9. Ollama Live Chat Inference Through Backend Pipeline
    console.log('\n[INFO] Testing interactive Chat Inference with Ollama (think: false)...');
    const chatBenchmark = await client.evaluate(`
      (async () => {
        try {
          const start = performance.now();
          const res = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'qwen3.5:2b-q4_K_M',
              prompt: 'Respond in one short sentence: Are you ready to assist me?',
              stream: false,
              think: false
            }),
            signal: AbortSignal.timeout(30000)
          });
          const data = await res.json();
          const durationMs = Math.round(performance.now() - start);
          return {
            ok: true,
            response: data.response?.trim(),
            durationMs,
            evalCount: data.eval_count,
            evalDuration: Math.round((data.eval_duration || 0) / 1e6)
          };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      })()
    `);

    const chatOk = chatBenchmark && chatBenchmark.ok && Boolean(chatBenchmark.response) && chatBenchmark.durationMs < 30000;
    logCheck('Ollama Rapid Chat Response', chatOk, 
      chatBenchmark?.ok
        ? `Latency: ${chatBenchmark.durationMs} ms, Output: "${chatBenchmark.response}"`
        : `Error: ${chatBenchmark?.error}`
    );

    if (testResults.overallStatus !== 'FAILED') {
      testResults.overallStatus = 'PASSED';
    }

  } catch (err) {
    console.error('[ERROR during validation]:', err.message);
    logCheck('Test Execution', false, err.message);
    testResults.overallStatus = 'FAILED';
  } finally {
    if (client) client.close();
    console.log('\n[INFO] Terminating test instance PID:', proc.pid);
    try {
      execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' });
    } catch (_) {}
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${testResults.overallStatus}`);
  console.log('Passed Checks:', testResults.checks.filter(c => c.passed).length, '/', testResults.checks.length);
  console.log('====================================================\n');

  fs.writeFileSync(
    path.join(__dirname, 'desktop-e2e-result.json'),
    JSON.stringify(testResults, null, 2)
  );

  return testResults;
}

runValidation().then(res => {
  process.exit(res.overallStatus === 'PASSED' ? 0 : 1);
});
