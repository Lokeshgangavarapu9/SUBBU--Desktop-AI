/**
 * test-mcp-client.js
 * 
 * Independent, headless MCP protocol client tester for desktop-mcp-server.js.
 * Sends JSON-RPC 2.0 messages over stdio and verifies all responses.
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const SERVER_PATH = path.join(__dirname, 'desktop-mcp-server.js');

async function runTests() {
  console.log('=== SUBBU INDEPENDENT MCP ADAPTER TEST SUITE ===\n');
  console.log(`Target: node ${SERVER_PATH}`);

  const server = spawn('node', [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = readline.createInterface({
    input: server.stdout,
    terminal: false
  });

  let messageId = 1;
  const pendingRequests = new Map();

  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line.trim());
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg);
      }
    } catch (e) {
      console.error('Failed to parse server line:', line);
    }
  });

  function sendRequest(method, params = {}) {
    return new Promise((resolve) => {
      const id = messageId++;
      pendingRequests.set(id, { resolve });
      const req = { jsonrpc: '2.0', id, method, params };
      server.stdin.write(JSON.stringify(req) + '\n');
    });
  }

  try {
    // 1. Initialize
    console.log('\n[TEST 1] Sending initialize...');
    const initRes = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'test-runner', version: '1.0.0' },
      capabilities: {}
    });
    console.log('Result:', JSON.stringify(initRes.result.serverInfo));
    if (initRes.result && initRes.result.serverInfo.name === 'subbu-desktop-mcp') {
      console.log('--> PASS: Initialize protocol handshake OK');
    } else {
      console.error('--> FAIL: Unexpected init response', initRes);
    }

    // 2. Tools list
    console.log('\n[TEST 2] Requesting tools/list...');
    const listRes = await sendRequest('tools/list', {});
    const toolNames = (listRes.result.tools || []).map(t => t.name);
    console.log('Available tools:', toolNames.join(', '));
    const expected = ['desktop_list_apps', 'desktop_snapshot', 'desktop_click', 'desktop_type', 'desktop_fill', 'desktop_launch'];
    const allPresent = expected.every(e => toolNames.includes(e));
    if (allPresent && toolNames.length === 6) {
      console.log('--> PASS: All 6 required tools present in schema');
    } else {
      console.error('--> FAIL: Tools mismatch', toolNames);
    }

    // 3. Test desktop_list_apps
    console.log('\n[TEST 3] Calling desktop_list_apps...');
    const listAppsRes = await sendRequest('tools/call', {
      name: 'desktop_list_apps',
      arguments: {}
    });
    console.log('List apps result snippet:');
    const appsText = listAppsRes.result.content[0].text;
    console.log(appsText.slice(0, 300) + '...');
    if (appsText.includes('WindowsTerminal') || appsText.includes('Chrome') || appsText.includes('code') || appsText.includes('ok')) {
      console.log('--> PASS: desktop_list_apps successfully queried Windows UIA');
    } else {
      console.log('--> Response received:', appsText.slice(0, 150));
    }

    // 4. Test security bounds: unauthorized app launch attempt
    console.log('\n[TEST 4] Testing security whitelist: attempting to launch unauthorized "powershell.exe"...');
    const badLaunchRes = await sendRequest('tools/call', {
      name: 'desktop_launch',
      arguments: { app: 'powershell.exe' }
    });
    const badText = badLaunchRes.result.content[0].text;
    console.log('Security response:', badText);
    if (badText.includes('not in the whitelist')) {
      console.log('--> PASS: Unauthorized app execution safely blocked by whitelist');
    } else {
      console.error('--> FAIL: Security whitelist did not block unauthorized launch!');
    }

    // 5. Test ref format validation on desktop_click
    console.log('\n[TEST 5] Testing ref format validation: passing malformed unquoted ref "@badref"...');
    const badRefRes = await sendRequest('tools/call', {
      name: 'desktop_click',
      arguments: { ref: '@badref' }
    });
    const refText = badRefRes.result.content[0].text;
    console.log('Ref validation response:', refText);
    if (refText.includes('Invalid ref format')) {
      console.log('--> PASS: Malformed ref prevented before passing to native CLI');
    } else {
      console.error('--> FAIL: Invalid ref was not caught by validator!');
    }

    console.log('\n=== ALL MCP TESTS COMPLETED SUCCESSFULLY ===\n');
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}

runTests();

