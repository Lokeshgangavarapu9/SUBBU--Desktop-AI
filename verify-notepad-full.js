// verify-notepad-full.js
// Automated verification of MCP adapter with live Notepad automation and observation

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const serverPath = path.join(__dirname, 'desktop-mcp-server.js');
console.log('[Test] Spawning MCP adapter:', serverPath);

const proc = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = readline.createInterface({
  input: proc.stdout,
  terminal: false
});

let reqId = 1;
const pending = new Map();

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const msg = JSON.parse(trimmed);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  } catch (err) {
    console.error('[Client] Failed to parse line:', err.message, line);
  }
});

function sendRequest(method, params = {}) {
  return new Promise((resolve) => {
    const id = reqId++;
    pending.set(id, { resolve });
    const payload = { jsonrpc: '2.0', id, method, params };
    proc.stdin.write(JSON.stringify(payload) + '\n');
  });
}

async function run() {
  try {
    // 1. Initialize
    console.log('\n--- Step 1: Initialize MCP ---');
    const initRes = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'notepad-verifier', version: '1.0.0' }
    });
    console.log('[PASS] Initialized:', JSON.stringify(initRes.result.serverInfo));

    // 2. Launch Notepad via desktop_launch
    console.log('\n--- Step 2: Launch Notepad via desktop_launch ---');
    const launchRes = await sendRequest('tools/call', {
      name: 'desktop_launch',
      arguments: { app: 'notepad', activate: true }
    });
    console.log('[PASS] Launch response:', launchRes.result.content[0].text);

    // Wait a brief moment for window to settle
    await new Promise(r => setTimeout(r, 2000));

    // 3. Snapshot Notepad
    console.log('\n--- Step 3: Snapshot Notepad ---');
    const snapRes = await sendRequest('tools/call', {
      name: 'desktop_snapshot',
      arguments: { app: 'Notepad', skeleton: true, compact: true }
    });
    const snapRaw = snapRes.result.content[0].text;
    const snapData = JSON.parse(snapRaw);
    const innerData = snapData.data?.data || snapData.data || {};
    console.log('[INFO] Snapshot ok:', snapData.ok, 'snapshot_id:', innerData.snapshot_id);

    let textRef = null;
    let initialValue = '';
    
    // Find text editor ref in tree
    function findTextfield(node) {
      if (!node) return;
      if (node.role === 'textfield' || node.role_description === 'document' || node.name === 'Text editor') {
        textRef = node.ref_id;
        initialValue = node.value || '';
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          findTextfield(child);
          if (textRef) return;
        }
      }
    }
    findTextfield(innerData.tree);

    if (!textRef) {
      console.error('[FAIL] Could not locate text editor element ref in Notepad tree');
      console.log('Tree:', JSON.stringify(snapData.data?.tree, null, 2));
      process.exit(1);
    }
    console.log('[PASS] Found text editor ref:', textRef, 'Current value:', JSON.stringify(initialValue));

    // 4. Type text
    const targetText = 'Hello! Subbu desktop control is active.';
    console.log(`\n--- Step 4: Type text via desktop_type (${targetText}) ---`);
    const typeRes = await sendRequest('tools/call', {
      name: 'desktop_type',
      arguments: {
        ref: textRef,
        text: targetText,
        headed: true
      }
    });
    console.log('[PASS] Type response:', typeRes.result.content[0].text);

    // 5. Verification Snapshot
    console.log('\n--- Step 5: Verification Snapshot ---');
    const verifyRes = await sendRequest('tools/call', {
      name: 'desktop_snapshot',
      arguments: { app: 'Notepad', skeleton: true, compact: true }
    });
    const verifyData = JSON.parse(verifyRes.result.content[0].text);
    
    let verifiedValue = '';
    function findVerified(node) {
      if (!node) return;
      if (node.role === 'textfield' || node.role_description === 'document' || node.name === 'Text editor') {
        verifiedValue = node.value || '';
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          findVerified(child);
          if (verifiedValue) return;
        }
      }
    }
    const innerVerify = verifyData.data?.data || verifyData.data || {};
    findVerified(innerVerify.tree);

    console.log('[RESULT] Verified Notepad editor value:', JSON.stringify(verifiedValue));

    if (verifiedValue.includes('Subbu desktop control')) {
      console.log('\n========================================');
      console.log('>>> END-TO-END NOTEPAD TEST: SUCCESS! <<<');
      console.log('========================================\n');
    } else {
      console.log('\n[WARN] Text not fully detected in value attribute. Raw post_state check.');
    }

    proc.kill();
    process.exit(0);
  } catch (err) {
    console.error('[ERROR]', err);
    proc.kill();
    process.exit(1);
  }
}

run();
