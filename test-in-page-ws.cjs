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

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  let targetPage = null;
  for (let i = 0; i < 30; i++) {
    await delay(500);
    try {
      const pages = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
      if (pages && pages.length > 0) {
        const page = pages.find(p => p.url && p.url.startsWith('http://tauri.localhost'));
        if (page) {
          targetPage = page;
          break;
        }
      }
    } catch (_) {}
  }

  if (!targetPage) {
    throw new Error('Target page not found within 15 seconds');
  }

  console.log('Target page found:', targetPage.url);
  const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

  ws.onopen = async () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

    const testScript = `
      (async () => {
        const invoker = window.__TAURI_INTERNALS__?.invoke || window.__TAURI__?.core?.invoke;
        const endpoint = await invoker("get_gateway_endpoint");
        return new Promise((resolve) => {
          const s = new WebSocket(endpoint);
          const logs = [];
          s.onopen = () => logs.push("OPEN");
          s.onmessage = (e) => logs.push("MSG: " + e.data.substring(0, 50));
          s.onerror = (e) => logs.push("ERR: " + (e.message || "error event"));
          s.onclose = (e) => {
            logs.push("CLOSE: code=" + e.code + " reason=" + e.reason + " clean=" + e.wasClean);
            resolve({ endpoint, logs });
          };
          setTimeout(() => {
            s.close();
            resolve({ endpoint, logs });
          }, 4000);
        });
      })()
    `;

    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: testScript,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id === 2) {
      console.log('WebView2 In-Page WebSocket Test Result:\n', JSON.stringify(data.result?.result?.value, null, 2));
      ws.close();
      try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
      process.exit(0);
    }
  };
}

run().catch(e => {
  console.error(e);
  try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
  process.exit(1);
});
