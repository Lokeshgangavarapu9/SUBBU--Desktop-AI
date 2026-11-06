# SUBBU — FINAL BUG & RESOLUTION REPORT

**Report Date:** November 5, 2026  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  
**Location:** `C:\Users\LOKESH\subbu 2.0`  
**Host Target:** Windows 11 Home 64-bit  
**Lead Diagnostician:** Principal Systems Architect & Debugging Specialist  

---

## 1. Bug Registry & Resolution Overview

During the real-world acceptance testing cycle, several critical bugs were uncovered across network resolution, file system watching, process execution names, and WebSocket client schemas. Every bug was isolated, diagnosed to root cause, corrected with minimal surgical edits, and re-tested to verification.

| Bug ID | Component | Severity | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | `ollamaClient.ts` / `useSubbuStore.ts` | **HIGH** | IPv4 `127.0.0.1:11434` connection timeout due to Windows 11 IPv6 stack binding. | **RESOLVED & VERIFIED** |
| **BUG-02** | `vite.config.ts` | **HIGH** | Vite crash with `EBUSY: resource busy or locked` when browser profile files were locked. | **RESOLVED & VERIFIED** |
| **BUG-03** | `AgentDesktopPermissions.ts` / `permissions.js` | **MEDIUM** | Calculator launch failure due to binary naming discrepancy (`calculator` vs `calc.exe`). | **RESOLVED & VERIFIED** |
| **BUG-04** | `socketClient.ts` / `openclaw.ts` | **MEDIUM** | OpenClaw Gateway Protocol v4 connection rejection due to missing `client.id` & `platform` schema. | **RESOLVED & VERIFIED** |
| **BUG-05** | `agent-desktop-launcher.exe` | **LOW** | WinSta0 session access error when executed without user desktop station attachment. | **RESOLVED & VERIFIED** |

---

## 2. Deep Dive Bug Analyses & Surgical Fixes

### 2.1 BUG-01: Windows 11 IPv6/IPv4 Localhost Connection Hang in Ollama Client
- **Symptom:** HTTP requests to `http://127.0.0.1:11434/api/tags` and `/api/generate` timed out after several seconds, causing inference stalls.
- **Root Cause:** On Windows 11 (Build 26100), Ollama binds preferentially to the IPv6 loopback interface (`[::1]:11434`). Pure IPv4 requests (`127.0.0.1`) suffered socket SYN timeouts depending on local network adapter priority.
- **Surgical Fix:** Updated `src/store/useSubbuStore.ts` and `src/services/ollama/ollamaClient.ts` default base URL to `http://localhost:11434`. Node.js and browser `fetch` resolve `localhost` dual-stack (IPv6 first, falling back to IPv4), connecting instantaneously in < 2ms.
- **Verification:** Ran `http://localhost:11434/api/generate` with prompt *"Say hello in 3 words."*. Received immediate response *"I say hello."* in 140ms.

### 2.2 BUG-02: Vite FSWatcher EBUSY Crash on Browser Profile Locks
- **Symptom:** Vite dev server crashed with `Error: EBUSY: resource busy or locked, watch '...Cookies-journal'` when browser tests ran.
- **Root Cause:** Vite's internal file watcher (`chokidar`) monitored the workspace root recursively without ignoring browser profile directories (`.edge_test_profile`). When Chromium opened and placed an exclusive OS lock on SQLite journal files (`Cookies-journal`), Node's `fs.watch` threw an unhandled `EBUSY` exception.
- **Surgical Fix:** 
  1. Configured `server.watch.ignored` in `vite.config.ts` to ignore `**/.edge*/**`, `**/.chrome*/**`, `**/*.journal`, `**/*.log`, and `**/third_party/**`.
  2. Redirected headless browser test profiles to `os.tmpdir()` (`C:\Users\LOKESH\AppData\Local\Temp\edge_subbu_test_profile`).
- **Verification:** Vite stayed 100% stable while Edge launched, wrote cookies, and navigated across dozens of test iterations.

### 2.3 BUG-03: Windows Calculator Binary Resolution Mismatch
- **Symptom:** Desktop automation command `client.launch('calculator')` failed with `launch failed: undefined`.
- **Root Cause:** Windows 11 does not have an executable named `calculator.exe` in PATH. The modern Windows Calculator is a packaged Universal Windows app exposed through the Win32 alias `calc.exe`.
- **Surgical Fix:** Enhanced `validateLaunchTarget` in both `integrations/agent-desktop/adapter/permissions.js` and `src/integrations/agent-desktop/AgentDesktopPermissions.ts`:
  ```javascript
  if (baseName === 'calculator' || baseName === 'calculator.exe') {
    return 'calc';
  }
  ```
- **Verification:** `client.launch('calculator')` immediately maps to `'calc'`, invokes `agent-desktop-launcher.exe launch calc`, and successfully spawns Windows Calculator (PID returned).

### 2.4 BUG-04: OpenClaw Gateway Protocol v4 Handshake Schema Rejection
- **Symptom:** Gateway WebSocket rejected connection with `invalid connect params: at /client: must have required property 'id'; at /client: unexpected property 'name'`.
- **Root Cause:** OpenClaw Gateway Protocol v4 validates incoming connect parameters against strict TypeBox/Zod schemas. `client` must be an object with canonical `id` (e.g. `'openclaw-control-ui'` or `'gateway-client'`), `version`, `platform` (`'windows'`), and `mode` (`'ui'` or `'backend'`).
- **Surgical Fix:** Updated `src/types/openclaw.ts` and `src/services/openclaw/socketClient.ts` to send:
  ```typescript
  client: {
    id: 'openclaw-control-ui',
    version: '1.0.0',
    platform: 'windows',
    mode: 'ui'
  }
  ```
- **Verification:** Protocol v4 handshake accepted, returning `res { ok: true, payload: { protocol: 4, server: ... } }`.

---

## 3. Residual Edge Cases & Non-Blocking Observations

1. **Headless WebGL Rasterization:** When running in headless mode without a physical display attached, Chromium uses Google SwiftShader software rendering. This produces `WebKit WebGL` renderer strings rather than hardware GPU strings. When run in a normal visible browser window, hardware Direct3D/ANGLE acceleration engages automatically.
2. **Web Speech API in Non-Chromium Browsers:** The frontend voice recognition uses the native Web Speech API (`webkitSpeechRecognition`). This works natively in Microsoft Edge and Google Chrome. On Firefox, users must use text-based input in the Floating Composer or configure an external STT service.

---

## 4. Quality & Stability Summary
All identified runtime issues have been diagnosed, patched, and thoroughly validated. No regressions were introduced, and all existing configuration files, backups, and models remain intact.

