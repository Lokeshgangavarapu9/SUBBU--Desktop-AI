# SUBBU 2.0 — Security & Safety Audit Report

**Audit Date:** 2026-11-05  
**Target Architecture:** Windows 11 Home Desktop Application  
**Classification:** Local-First Desktop AI Security Certification

---

## 1. Security Architecture Overview

SUBBU 2.0 operates as an autonomous desktop companion with native OS automation capabilities. To prevent arbitrary code execution, privilege escalation, credential theft, or unauthorized data destruction, SUBBU incorporates defense-in-depth security gates:

```
[User Request / AI Intent]
            │
            ▼
┌──────────────────────────────────────┐
│       ALLOWLIST & PATH VALIDATOR     │  -> Blocks unrecognized executables, UNC paths, and command injection
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│     EXECUTIVE APPROVAL MODAL GATE    │  -> Prompts user with risk level, exact command, and working directory
└──────────────────┬───────────────────┘
                   │ (Explicit User Grant)
                   ▼
┌──────────────────────────────────────┐
│    WINDOWLESS WIN32 LAUNCHER ENGINE  │  -> Spawns silently on WinSta0\Default under non-elevated user context
└──────────────────────────────────────┘
```

---

## 2. Security Safeguard Assessment

| Security Control | Implementation Location | Enforcement Level | Verification Status |
| :--- | :--- | :--- | :--- |
| **Privileged Action Approval Gate** | `src/components/modals/ApprovalModal.tsx` | Mandatory Modal Intercept | **VERIFIED**: Operations flagged as high-risk require explicit user approval before execution. |
| **Binary & Application Allowlist** | `src/services/backend/SubbuBackendAdapter.ts` | Strict Whitelist | **VERIFIED**: Only approved executables (`notepad.exe`, `calc.exe`, `msedge.exe`, `explorer.exe`) can be launched automatically. |
| **Command Injection Immunity** | `agent-desktop-launcher.cs` / `bin/subbu.cjs` | Sanitized Argument Arrays | **VERIFIED**: Commands use parameterized `ProcessStartInfo` rather than raw `cmd.exe /c` string concatenation. |
| **Localhost Isolation** | `src/store/useSubbuStore.ts` | Loopback Only (`127.0.0.1`) | **VERIFIED**: Ollama (`11434`) and OpenClaw (`18789`) bind exclusively to loopback addresses. |
| **Credential & Token Protection** | `src/services/backend/SubbuBackendAdapter.ts` | In-Memory Token Vault | **VERIFIED**: Auth tokens are never written to disk or logged to unencrypted console files. |
| **Diagnostics Data Sanitization** | `src/components/modals/SystemStatusModal.tsx` | Redaction Filter | **VERIFIED**: Exported diagnostics files (`subbu-diagnostics-*.json`) redact user message contents, file paths, and auth headers. |
| **Speech Privacy Protection** | `src/services/audio/voiceManager.ts` | On-Demand Microphone Lease | **VERIFIED**: Microphone is active only during listening mode; zero continuous audio streaming to external cloud endpoints. |
| **Path Traversal Protection** | `src/types/tasks.ts` | Path Normalization | **VERIFIED**: Relative `../` path traversal outside designated workspace directories is rejected. |

---

## 3. Threat Model & Mitigation Matrix

### Threat 1: Malicious Prompt Injection Attempting Shell Execution
- **Attack Vector:** An untrusted web page or prompt asks SUBBU to execute `del /f /s C:\*` or download remote payloads via PowerShell.
- **Mitigation:** SUBBU intercepts the `exec.approval.requested` event and mounts the `ApprovalModal`. The user must manually review the command and click "Approve" before any execution is dispatched. Unapproved requests are rejected immediately.

### Threat 2: Secret Leakage via Telemetry or Logs
- **Attack Vector:** A user exports system diagnostics while discussing private API keys or personal data.
- **Mitigation:** The `exportDiagnostics` function filters hardware metrics and system health indicators only. All `messages`, `streamingText`, `memories`, and `authToken` properties are excluded from the exported JSON object.

### Threat 3: Unauthorized Background Desktop Manipulation
- **Attack Vector:** Rogue background scripts attempting to click banking or credential interfaces.
- **Mitigation:** Agent Desktop requires active desktop session context (`WinSta0\Default`) and prompts for approval on any destructive action. Sensitive services like Google Calendar defer authentication directly to the user's browser without capturing credentials.

---

## 4. Security Sign-Off

SUBBU 2.0 has met all security criteria. The system enforces strict principle-of-least-privilege execution, robust human-in-the-loop approvals, and complete local isolation.

