# SUBBU — Unified Desktop Automation Architecture

**Author:** Principal Software Architect, Desktop Automation Engineer  
**Date:** 5 November 2026  
**Target Platform:** Windows 11 Home 64-bit, Microsoft UI Automation (UIA) COM, Win32 SendInput  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  

---

## 1. Architectural Philosophy: One Desktop Subsystem

SUBBU deliberately rejects maintaining fragmented, competing desktop automation frameworks. Instead, it unifies:
1. **Vercel Agent Desktop:** For deep, deterministic accessibility tree inspection and native UIA COM manipulation.
2. **Interactive Station Bridge (`agent-desktop-launcher.exe`):** For Windows session station attachment (`WinSta0\Default`), guaranteeing subshells have full interactive GUI access.
3. **SUBBU Desktop MCP Server (`desktop-mcp-server.js`):** For security enforcement, argument sanitization, token scoping, and tool schema exposure to OpenClaw.
4. **OpenClaw Gateway:** For agent intent routing, conversation context, task lifecycle management, and interactive approval gates.

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                SUBBU AI Assistant                      │
                                  │               (Natural Language Intent)                │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │               DesktopCapabilityManager                 │
                                  │  - Evaluates action risk level (Low / Med / High)      │
                                  │  - Checks Whitelists & Approvals                       │
                                  │  - Enforces Observe -> Plan -> Act -> Verify Pipeline  │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │                 OpenClaw Gateway                       │
                                  │         (Tool Selection & Execution Protocol)          │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │           Desktop MCP Server (desktop-mcp-server.js)   │
                                  │  - 15 Native Tools (Apps, Windows, Snapshot, Type...)  │
                                  │  - Argument Sanitization & Token Formatting            │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │         Interactive Bridge (agent-desktop-launcher.exe)│
                                  │  - Attaches process to WinSta0\Default                 │
                                  │  - Resolves EnumWindows & SendInput subshell blocks    │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │              Native Windows OS GUI                     │
                                  │       (UI Automation COM Server & Win32 Input Queue)   │
                                  └────────────────────────────────────────────────────────┘
```

---

## 2. Observe $\rightarrow$ Plan $\rightarrow$ Act $\rightarrow$ Verify $\rightarrow$ Report Pipeline

Every single desktop interaction follows an uncompromised 5-stage lifecycle:

```
[OBSERVE]  ───>  [PLAN]  ───>  [ACT]  ───>  [VERIFY]  ───>  [REPORT]
```

### Stage 1: OBSERVE
- Captures the target application's UI accessibility tree using compact flags:
  `agent-desktop snapshot --app <app> --interactive-only --skeleton --compact`
- Generates snapshot-qualified element references (`@ref`, e.g. `@sggfg65z0sn7a:e1`).
- Auto-disambiguates if multiple windows of the same application exist by querying candidate window IDs.

### Stage 2: PLAN
- Evaluates the target element's `available_actions` from the snapshot payload (`SetValue`, `Invoke`, `Click`, `SetFocus`).
- Selects the optimal execution mechanism:
  - **Modern UI Elements (WPF, WinUI, Electron):** Semantic mutation via `set-value` (`ValuePattern`) or `click` (`InvokePattern`) without moving the physical mouse cursor.
  - **Legacy Win32 Controls (e.g. classic Notepad edit area):** Physical headed input via `type <ref> <text> --headed` or mouse positioning.

### Stage 3: ACT
- Checks permissions and safety boundaries. If the action is high risk (e.g. launching apps, closing windows), prompts the user for explicit confirmation.
- Executes the action via `child_process.execFile` with direct argument vectors (no shell execution).
- Implements automatic retry semantics: if headed input fails due to foreground window transitions, gracefully retries with semantic UIA invocation.

### Stage 4: VERIFY
- Never assumes success based solely on command exit codes.
- Takes a post-action verification snapshot.
- Confirms that the target value was updated or the window state transitioned.

### Stage 5: REPORT
- Emits structured execution telemetry to SUBBU's `TasksDrawer` and character controller.
- The 3D character reacts appropriately:
  - **Verified Success:** Delighted expression (`task_success`), celebratory nod.
  - **Action Failure:** Concerned expression (`task_error`), clear human explanation of the failure reason without pretending the task succeeded.

---

## 3. Toolset Inventory & Schema

| Tool Name | Operation Type | Risk Level | Implementation Mechanism |
| :--- | :--- | :--- | :--- |
| `desktop_list_apps` | Observation | Low | `EnumWindows` + Shell process matching |
| `desktop_list_windows`| Observation | Low | `EnumWindows` + Title and PID resolution |
| `desktop_snapshot` | Observation | Low | UIA `IUIAutomationTreeWalker` + Skeletonizer |
| `desktop_find` | Observation | Low | UIA Property Conditions (Name, Role, Class) |
| `desktop_get` | Observation | Low | UIA Property Retrieval (Value, Bounds) |
| `desktop_is` | Observation | Low | State Verification (Visible, Enabled, Focused) |
| `desktop_status` | Observation | Low | Diagnostic probe (Version, Station status) |
| `desktop_focus_window`| Window Control | Medium | Win32 `SetForegroundWindow` / `ShowWindow` |
| `desktop_click` | Mutation | Medium | UIA `InvokePattern` / Win32 `SendInput` (headed fallback) |
| `desktop_type` | Mutation | Medium | Win32 `SendInput` keyboard simulation / `ValuePattern` fallback |
| `desktop_fill` | Mutation | Medium | UIA `ValuePattern.SetValue` (instant semantic fill) |
| `desktop_press` | Mutation | Medium | Win32 Virtual Key simulation (Enter, Tab, Esc) |
| `desktop_launch` | Process Launch | High (Approval)| Win32 `ShellExecuteEx` on whitelisted executables |
| `desktop_clipboard_get`| Clipboard | Low | Win32 `GetClipboardData` |
| `desktop_clipboard_set`| Clipboard | High (Approval)| Win32 `SetClipboardData` |

---

## 4. Security Sandbox Rules

1. **Permitted Executables:** Only `notepad`, `calc`/`calculator`, `explorer`, `chrome`, and `code` are allowed for launching. All other binaries are rejected at the argument validation boundary.
2. **No Arbitrary Shells:** `powershell.exe`, `cmd.exe`, `bash`, `wscript`, `cscript`, and script execution tools are strictly blocked.
3. **Session Station Enforcement:** Operations run under the active logged-in Windows user desktop station, respecting standard Windows User Account Control (UAC) boundaries. Elevated administrative tasks require standard OS elevation.

