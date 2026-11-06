const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const EXE_PATH = path.join(__dirname, 'src-tauri', 'target', 'release', 'subbu-desktop.exe');
const CDP_PORT = 9222;

const proc = spawn(EXE_PATH, [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
  stdio: ['pipe', 'pipe', 'pipe']
});

proc.stdout.on('data', d => console.log('[STDOUT]', d.toString()));
proc.stderr.on('data', d => console.log('[STDERR]', d.toString()));

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
      let d = '';
      r.on('data', chunk => d += chunk);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = pages.find(p => p.url && p.url.startsWith('http://tauri.localhost'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            const invoker = window.__TAURI_INTERNALS__.invoke;
            const endpoint = await invoker("get_gateway_endpoint");
            console.log("Connecting in-page to endpoint:", endpoint);
            const s = new WebSocket(endpoint);
            s.onopen = () => console.log("IN-PAGE OPEN!");
            s.onerror = (e) => console.log("IN-PAGE ERROR:", e);
            s.onclose = (e) => console.log("IN-PAGE CLOSE:", e.code, e.reason);
          })()
        `
      }
    }));
    setTimeout(() => {
      ws.close();
      proc.kill();
      process.exit(0);
    }, 4000);
  };
}

run().catch(e => {
  console.error(e);
  proc.kill();
  process.exit(1);
});

