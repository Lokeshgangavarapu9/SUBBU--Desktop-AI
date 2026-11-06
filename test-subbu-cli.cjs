/**
 * test-subbu-cli.cjs
 * Automated test suite for the SUBBU CLI commands on Windows 11.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('            SUBBU CLI AUTOMATED VERIFICATION SUITE              ');
console.log('================================================================\n');

const tests = [
  {
    name: 'CLI Help Output',
    cmd: 'subbu help',
    expect: 'SUBBU CLI — Personal AI Desktop Companion',
  },
  {
    name: 'CLI Version Flag',
    cmd: 'subbu -v',
    expect: 'SUBBU CLI v1.0.0',
  },
  {
    name: 'CLI Status Command',
    cmd: 'subbu status',
    expect: 'Checking Ollama Engine',
  },
  {
    name: 'CLI Status JSON Output',
    cmd: 'subbu status --json',
    expect: '"status": "ONLINE"',
  },
  {
    name: 'CLI Open Browser',
    cmd: 'subbu open browser',
    expect: 'Launching Web Browser',
  },
  {
    name: 'CLI Open Calendar',
    cmd: 'subbu open calendar',
    expect: 'Opening Google Calendar',
  },
  {
    name: 'CLI Open Notepad',
    cmd: 'subbu open notepad',
    expect: 'Launching Notepad',
  },
  {
    name: 'CLI Open Calculator',
    cmd: 'subbu open calculator',
    expect: 'Launching Windows Calculator',
  },
  {
    name: 'CLI 2-Second Timer Loop',
    cmd: 'subbu timer 2s',
    expect: 'Ding! Time is up!',
  },
];

let passed = 0;
for (const t of tests) {
  process.stdout.write(`Testing [${t.name}]... `);
  try {
    const stdout = execSync(t.cmd, { encoding: 'utf8', timeout: 25000 });
    if (stdout.includes(t.expect)) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log('❌ FAIL (missing expected pattern)');
      console.log(`   Expected to contain: "${t.expect}"`);
      console.log(`   Output: ${stdout.trim().slice(0, 150)}...`);
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
  }
}

console.log('\n================================================================');
console.log(`VERIFICATION RESULT: ${passed} / ${tests.length} TESTS PASSED`);
console.log('================================================================\n');

process.exit(passed === tests.length ? 0 : 1);

