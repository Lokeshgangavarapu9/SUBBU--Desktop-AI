const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const EXE_PATH = path.join(__dirname, 'src-tauri', 'target', 'release', 'subbu-desktop.exe');
const CDP_PORT = 9222;

const proc = spawn(EXE_PATH, [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
  detached: true,
  stdio: 'ignore'
});

async function main() {
  await new Promise(r => setTimeout(r, 2000));
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
      let d = '';
      r.on('data', chunk => d += chunk);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = pages.find(p => p.url && p.url.startsWith('http://tauri.localhost'));
  const cdp = new WebSocket(page.webSocketDebuggerUrl);

  cdp.onopen = () => {
    cdp.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: 'window.__TAURI_INTERNALS__.invoke("get_gateway_endpoint")',
        awaitPromise: true,
        returnByValue: true
      }
    }));
  };

  cdp.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id === 1) {
      const endpoint = data.result?.result?.value;
      console.log('Bridge endpoint from Tauri:', endpoint);
      testBridgeWs(endpoint);
    }
  };
}

function testBridgeWs(endpoint) {
  console.log('Testing WebSocket connection to bridge:', endpoint);
  const ws = new WebSocket(endpoint);
  ws.onopen = () => {
    console.log('[BRIDGE WS OPEN] Connected successfully!');
  };
  ws.onmessage = (ev) => {
    console.log('[BRIDGE WS MESSAGE]:', ev.data);
  };
  ws.onerror = (err) => {
    console.error('[BRIDGE WS ERROR]:', err);
  };
  ws.onclose = (ev) => {
    console.log('[BRIDGE WS CLOSED] code:', ev.code, 'reason:', ev.reason);
    cleanup();
  };
}

function cleanup() {
  try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  cleanup();
});

