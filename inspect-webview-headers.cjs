const net = require('net');
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const server = net.createServer((sock) => {
  sock.on('data', (d) => {
    console.log('--- RECEIVED FROM WEBVIEW2 ---\n' + d.toString('utf8'));
    sock.end();
  });
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log('Dummy server listening on port:', port);

  const EXE_PATH = path.join(__dirname, 'src-tauri', 'target', 'release', 'subbu-desktop.exe');
  const CDP_PORT = 9222;

  const proc = spawn(EXE_PATH, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
    detached: true,
    stdio: 'ignore'
  });

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
        expression: `new WebSocket("ws://127.0.0.1:${port}")`
      }
    }));
    setTimeout(() => {
      ws.close();
      server.close();
      try { execSync(`taskkill /PID ${proc.pid} /T /F`); } catch (_) {}
      process.exit(0);
    }, 1500);
  };
});

