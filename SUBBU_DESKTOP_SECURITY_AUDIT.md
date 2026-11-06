# SUBBU 2.0 — Desktop Security Audit

**Audit Date:** 2026-11-05  
**Target Environment:** Standalone Windows 11 Desktop Application (Tauri 2 / WebView2)  
**Security Reference:** Tauri v2 Security Architecture ([https://v2.tauri.app/security/](https://v2.tauri.app/security/))

---

## 1. Security Baseline & Threat Analysis

Transitioning an AI assistant from a local web browser to a standalone desktop application expands the potential attack surface. Desktop applications have access to native Windows APIs, file system storage, and child process execution.

This audit evaluates SUBBU's security controls across five key domains:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY CONTROLS MATRIX                        │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Security Boundary     │ Implemented Mechanism  │ Enforcement Status    │
├───────────────────────┼────────────────────────┼───────────────────────┤
│ 1. IPC & Window Mgmt  │ Tauri Capabilities     │ STRICT (Minimal core) │
│ 2. Command Execution  │ Executive Modal Gate   │ USER-IN-THE-LOOP      │
│ 3. Automation Bounds  │ Allowlisted Binaries   │ STRICT (4 apps only)  │
│ 4. Network Loopback   │ Content Security Policy│ STRICT (127.0.0.1)    │
│ 5. Telemetry & Export │ Secret Redaction       │ VERIFIED SANITIZED    │
└───────────────────────┴────────────────────────┴───────────────────────┘
```

---

## 2. Detailed Security Domain Audit

### 2.1 Tauri Capabilities & IPC Boundaries
- **Audited File:** `src-tauri/capabilities/default.json`.
- **Configured Permissions:**
  ```json
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-close"
  ]
  ```
- **Evaluation:** Minimalist and secure. It grants only basic window framing capabilities. It does **not** grant unrestricted filesystem access, shell execution, or arbitrary network access.
- **Tauri 2 Core Safety:** In Tauri 2, IPC commands must be explicitly registered and bound to capabilities. Unregistered commands cannot be executed by injected frontend scripts.

### 2.2 Content Security Policy (CSP) Inspection
- **Audited Configuration:** `src-tauri/tauri.conf.json` -> `app.security.csp`.
- **Enforced Directives:**
  - `default-src 'self'` — Disallows loading untrusted external scripts.
  - `connect-src 'self' ws://127.0.0.1:18789 http://127.0.0.1:18789 http://127.0.0.1:11434 ws://localhost:* http://localhost:*` — Restricts all socket and HTTP traffic strictly to local machine loopback.
  - `font-src 'self' https://fonts.gstatic.com` — Restricted to official Google Fonts CDN.
- **Evaluation:** Strict localhost isolation prevents remote data exfiltration.

### 2.3 Executive Approval Gate (`ApprovalModal.tsx`)
- **Mechanism:** Any request to execute system shell commands or alter persistent state triggers an event (`exec.approval.requested`).
- **Enforcement:** The frontend intercepts this event and renders the modal gate, displaying:
  - Exact command line.
  - Working directory.
  - Assessed risk level (High / Medium / Low).
  - Explicit "Approve" and "Reject" buttons.
- **Evaluation:** Human-in-the-loop control is preserved. Unapproved commands cannot proceed autonomously.

### 2.4 Desktop Automation Whitelisting
- **Mechanism:** The backend adapter enforces an allowlist of permitted applications for automated desktop operations:
  - `notepad.exe`
  - `calc.exe`
  - `msedge.exe`
  - `explorer.exe`
- **Evaluation:** Commands attempting to launch cmd.exe, powershell.exe, regedit, or arbitrary downloaded binaries without user approval are blocked.

### 2.5 Credential & Token Protection
- **Token Vault:** The OpenClaw gateway authentication token is passed via memory and environment variables; it is never written to public frontend assets.
- **Google Calendar OAuth:** SUBBU does not capture or store user Google credentials. It redirects to the default browser for Google's official sign-in flow (`AUTH REQUIRED` protocol).
- **Diagnostics Sanitization:** The diagnostic export function (`exportDiagnostics`) explicitly redacts:
  - User chat message content.
  - File paths.
  - Authentication headers.
  - Prompt history.

---

## 3. Desktop Security Recommendations for Phase 2 & 3

1. **Retain Strict CSP:** Do not relax the loopback CSP to allow wildcards (`*`). Keep all backend traffic pinned to `127.0.0.1`.
2. **Explicit Binary Paths for Sidecars:** When declaring `agent-desktop-launcher.exe` in Tauri's external binary manifest, specify exact file hashes to prevent binary replacement attacks.
3. **Preserve Subsystem Isolation:** Keep `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` in `main.rs` to ensure no accessible console subsystem is attached to the release executable.

