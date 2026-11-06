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

async function run() {
  await new Promise(r => setTimeout(r, 4000));
  const pages = await new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
      let d = '';
      r.on('data', chunk => d += chunk);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = pages.find(p => p.url && p.url.startsWith('http://tauri.localhost'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  ws.onopen = async () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));

    const evalMsg = {
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            const body = document.body.innerText;
            return {
              bodyLength: body.length,
              statusText: body.includes('Connected') ? 'CONNECTED' : (body.includes('Connecting...') ? 'CONNECTING' : 'OTHER'),
              fullText: body
            };
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      }
    };
    ws.send(JSON.stringify(evalMsg));
  };

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.method === 'Console.messageAdded' || data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', JSON.stringify(data.params));
    }
    if (data.id === 3) {
      console.log('[EVAL RESULT]:', JSON.stringify(data.result?.result?.value, null, 2));
      setTimeout(() => {
        ws.close();
        try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
        process.exit(0);
      }, 2000);
    }
  };
}

run().catch(e => {
  console.error(e);
  try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
  process.exit(1);
});
