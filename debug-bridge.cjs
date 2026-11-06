const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Read active token from ~/.openclaw/openclaw.json
const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = cfg.gateway?.auth?.token;
console.log('Using token from openclaw.json:', token ? (token.substring(0, 8) + '...') : 'NONE');

// Connect to OpenClaw upstream on 18789
const client = net.createConnection({ host: '127.0.0.1', port: 18789 }, () => {
  console.log('Connected to OpenClaw TCP');
  const req = 'GET / HTTP/1.1\r\n' +
    'Host: 127.0.0.1:18789\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
    'Sec-WebSocket-Version: 13\r\n' +
    'Origin: http://tauri.localhost\r\n\r\n';
  client.write(req);
});

let phase = 0;
client.on('data', (d) => {
  console.log('[Phase ' + phase + '] Raw data length:', d.length);
  if (phase === 0) {
    console.log('[HTTP Response]:\n', d.toString('utf8', 0, Math.min(250, d.length)));
    phase = 1;
  } else if (phase === 1) {
    console.log('[Challenge]:', d.toString('utf8'));
    // Now let's send connect request frame with token!
    const connectPayload = JSON.stringify({
      type: 'req',
      id: 'debug-connect-1',
      method: 'connect',
      params: {
        minProtocol: 4,
        maxProtocol: 4,
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.approvals', 'operator.talk.secrets'],
        caps: ['tool-events', 'inline-widgets', 'chat-only-assistant-text', 'presence-deltas', 'session-row-deltas'],
        auth: { token },
        client: { id: 'gateway-client', version: '1.0.0', platform: 'windows', mode: 'backend' }
      }
    });

    const payloadBuf = Buffer.from(connectPayload, 'utf8');
    const len = payloadBuf.length;
    let header;
    const maskKey = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    
    if (len <= 125) {
      header = Buffer.from([0x81, 0x80 | len]);
    } else if (len <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }

    const maskedPayload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      maskedPayload[i] = payloadBuf[i] ^ maskKey[i % 4];
    }

    const frame = Buffer.concat([header, maskKey, maskedPayload]);
    console.log('Sending connect frame length:', frame.length);
    client.write(frame);
    phase = 2;
  } else {
    console.log('[Response after connect]:', d.toString('utf8'));
    client.end();
  }
});

client.on('error', (e) => console.error('Socket error:', e.message));
client.on('close', () => console.log('Socket closed'));

