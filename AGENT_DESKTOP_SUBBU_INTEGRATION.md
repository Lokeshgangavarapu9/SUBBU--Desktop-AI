# SUBBU — Agent Desktop Integration Guide

**Integration Target:** [vercel-labs/agent-desktop](https://github.com/vercel-labs/agent-desktop)  
**Host Environment:** Windows 11 Home 64-bit, OpenClaw 2026.10.10 Gateway, Node.js v22.18.0, Ollama Qwen 3.5  
**Project:** SUBBU — Personal AI Desktop Companion  
**Status:** Integrated & Verified (12/12 Integration Tests Passing)  

---

## 1. Architecture Overview

The SUBBU Agent Desktop integration brings native Windows accessibility automation to SUBBU without reliance on brittle computer vision or coordinate-guessing. By leveraging Microsoft UI Automation (UIA) COM interfaces through a dedicated desktop station bridge, SUBBU inspects live application accessibility trees, interacts with controls semantically, and falls back to headed Win32 `SendInput` simulation when physical interaction is necessary.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUBBU Frontend (React)                          │
│        (ThoughtBubble, TasksDrawer, ControlBar, 3D Character HUD)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSocket Events / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SUBBU Backend Runtime                           │
│   (SubbuBackendAdapter, AgentDesktopManager, Events Dispatcher)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ OpenClaw Gateway / Stdio MCP
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               SUBBU Desktop MCP Server (`desktop-mcp-server.js`)       │
│   - Security Boundaries & Whitelisting                                 │
│   - Observe -> Act -> Verify Pipeline                                  │
│   - 15 Native Tools (Original 6 + Advanced v1.2.0 capabilities)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Process Execution
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Interactive Station Bridge (`agent-desktop-launcher.exe`)   │
│   - Binds to WinSta0\Default Interactive Desktop Station               │
│   - Prevents EnumWindows and SendInput subshell permission failures    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ CLI Execution
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Vercel Agent Desktop Engine                         │
│            (Microsoft UI Automation COM + Win32 SendInput)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Map & Component Directory

| Path | Purpose |
| :--- | :--- |
| `integrations/agent-desktop/upstream/` | Isolated clone of `vercel-labs/agent-desktop` (v1.2.0, Apache-2.0). |
| `src/integrations/agent-desktop/AgentDesktopTypes.ts` | TypeScript schemas, `@ref` identifiers, snapshot trees, and result interfaces. |
| `src/integrations/agent-desktop/AgentDesktopErrors.ts` | Normalized error hierarchy (`ELEMENT_NOT_FOUND`, `POLICY_DENIED`, `STATION_NOT_INTERACTIVE`, etc.). |
| `src/integrations/agent-desktop/AgentDesktopPermissions.ts` | Whitelist validators, argument sanitizers, and risk level estimators. |
| `src/integrations/agent-desktop/AgentDesktopHealth.ts` | Diagnostic probes for version, UIA COM status, and desktop station availability. |
| `src/integrations/agent-desktop/AgentDesktopEvents.ts` | Event dispatcher emitting lifecycle telemetry to the SUBBU HUD and TasksDrawer. |
| `src/integrations/agent-desktop/AgentDesktopClient.ts` | Isomorphic execution client for browser and Node.js environments. |
| `src/integrations/agent-desktop/AgentDesktopAdapter.ts` | Automated **Observe $\rightarrow$ Act $\rightarrow$ Verify** loop workflow manager. |
| `src/integrations/agent-desktop/AgentDesktopManager.ts` | Singleton lifecycle orchestrator export. |
| `integrations/agent-desktop/adapter/` | Native CommonJS adapter package for backend scripts and MCP servers. |
| `desktop-mcp-server.js` | Unified MCP stdio server registered with OpenClaw Gateway. |
| `agent-desktop-launcher.exe` | Compiled C# wrapper ensuring `WinSta0\Default` interactive station attachment. |
| `test-agent-desktop-integration.cjs` | 12-stage automated integration test suite. |

---

## 3. Observe $\rightarrow$ Act $\rightarrow$ Verify Workflow

Every stateful desktop automation task follows the **Observe $\rightarrow$ Act $\rightarrow$ Verify** lifecycle:

1. **Observe:** Capture an accessibility snapshot of the target window using `--skeleton`, `--interactive-only`, and `--compact` flags. Elements are assigned snapshot-qualified `@ref` IDs (e.g. `@sggfg65z0sn7a:e1`).
2. **Act:** Execute the target mutation:
   - Modern controls: Semantic mutation via `set-value` (`ValuePattern`) or `click` (`InvokePattern`).
   - Legacy Win32 controls: Physical keyboard typing via `type <ref> <text> --headed` or mouse positioning.
3. **Verify:** Capture a verification snapshot to ensure the control received the text or triggered state transition.

---

## 4. Security & Safety Boundaries

1. **Application Whitelist:**
   - Only explicitly approved executables are permitted for launching: `notepad`, `calc`/`calculator`, `explorer`, `chrome`, and `code`.
   - Arbitrary binaries, shell interpreters (`powershell.exe`, `cmd.exe`), and utilities (`certutil`, `curl`) are rejected at the parameter validation boundary.
2. **Command Injection Prevention:**
   - Arguments are validated against command chaining characters (`;`, `&`, `|`, `` ` ``, `$`, `%`, `>`, `<`).
   - Execution uses direct Windows `CreateProcess` via `child_process.execFile` (no shell intermediate).
3. **Token Scoping:**
   - Ephemeral `@ref` tokens expire with subsequent snapshots, preventing stale element mutations.
4. **Approval Gates:**
   - High-risk operations (application launch, closing, clipboard modification) trigger approval prompts in the SUBBU frontend before execution.

---

## 5. Automated 12-Stage Integration Test Verification

The automated verification suite was executed against the live Windows desktop session:

```
================================================================
   SUBBU - AGENT DESKTOP INTEGRATION 12-STAGE TEST SUITE
================================================================

[TEST 1] ✅ Repository Integrity & Structure: PASS
   Details: Upstream cloned cleanly. Cargo.toml and crates present.
[TEST 2] ✅ Integration Layer Initialization: PASS
   Details: Client and Adapter instantiated successfully with valid API signatures.
[TEST 3] ✅ Health Check & Diagnostics: PASS
   Details: Version: agent-desktop 1.1.0, Launcher Active: true, Station Interactive: true
[TEST 4] ✅ Application Discovery: PASS
   Details: Enumerated running applications successfully (active apps found) without EnumWindows failure.
[TEST 5] ✅ Application Launch (Notepad): PASS
   Details: Launched notepad.exe successfully via desktop station launcher.
[TEST 6] ✅ Window Observation & Snapshot: PASS
   Details: Captured Notepad snapshot. Root role: window. Target edit ref: @sggfg65z0sn7a:e1
[TEST 7] ✅ Text Entry: PASS
   Details: Typed "Hello! Agent Desktop is integrated with SUBBU." into ref @sggfg65z0sn7a:e1 using headed keyboard simulation.
[TEST 8] ✅ UI Interaction (Click): PASS
   Details: Invoked click on interactive element @sggfg65z0sn7a:e4 successfully via UIA.
[TEST 9] ✅ Failure Handling & Recovery: PASS
   Details: Correctly caught and reported invalid/stale ref: "undefined" without process crashing.
[TEST 10] ✅ Approval Handling & Safety Boundaries: PASS
   Details: Blocked unwhitelisted executable (cmd.exe) at validation boundary.
[TEST 11] ✅ Integration Lifecycle: PASS
   Details: Lifecycle and display query verified without lingering zombie handles.
[TEST 12] ✅ Existing Functionality Regression Test: PASS
   Details: All 6 original MCP tools preserved with 100% backward compatibility.

================================================================
                      TEST RESULTS SUMMARY                      
================================================================
TOTAL: 12 | PASSED: 12 | FAILED: 0 | SKIPPED: 0
================================================================
```

---

## 6. Usage Examples

### TypeScript / Frontend Component Usage
```typescript
import { AgentDesktopManager } from './src/integrations/agent-desktop';

const manager = AgentDesktopManager.getInstance();

// 1. Observe and type into Notepad
await manager.adapter.launchAndType(
  'notepad',
  'Hello! Agent Desktop is integrated with SUBBU.'
);

// 2. Observe -> Act -> Verify
const result = await manager.adapter.observeActVerify(
  'Notepad',
  async (ref) => manager.client.click({ ref }),
  { role: 'button', nameSubstr: 'Settings' }
);

console.log('Action verified:', result.verified);
```

### Backend CommonJS / MCP Server Usage
```javascript
const { AgentDesktopNodeClient, AgentDesktopNodeAdapter } = require('./integrations/agent-desktop/adapter');

const client = new AgentDesktopNodeClient();
const adapter = new AgentDesktopNodeAdapter(client);

async function run() {
  const status = await client.getStatus();
  console.log('Desktop Automation Ready:', status.ok);

  const snapshot = await client.snapshot({ app: 'Notepad', skeleton: true });
  console.log('Active snapshot id:', snapshot.data?.snapshot_id);
}
```

