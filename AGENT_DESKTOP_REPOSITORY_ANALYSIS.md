# Agent Desktop Repository Analysis & SUBBU Integration Blueprint

**Target Repository:** [vercel-labs/agent-desktop](https://github.com/vercel-labs/agent-desktop)  
**Analyzed Commit:** `2b0a7334fc111730454b726e6800aa41cdafc093` (Tag: `1.2.0`)  
**License:** Apache-2.0  
**Host Environment:** Windows 11 Home 64-bit (x86_64), Node.js v22.18.0, OpenClaw 2026.10.10, Ollama Qwen 3.5  
**Project:** SUBBU — Personal AI Desktop Companion  

---

## 1. Executive Summary & Upstream Architecture

`agent-desktop` by Vercel Labs is a high-performance cross-platform desktop automation engine implemented in Rust, designed specifically for AI agent computer use. Unlike pixel-based vision models (VLM) that rely on mouse coordinates and screenshot OCR, `agent-desktop` inspects and manipulates the operating system's native accessibility tree.

On Windows, it directly invokes **Microsoft UI Automation (UIA)** via native COM interfaces (`IUIAutomation`, `IUIAutomationTreeWalker`, `IUIAutomationElement`) combined with Win32 input APIs (`SendInput`).

### Key Value Propositions for SUBBU
1. **Deterministic Element Addressing (`@ref` IDs):** Elements are assigned ephemeral, snapshot-scoped tokens (e.g. `@s7k2p9:e12`) that resolve directly to live UIA elements.
2. **Token Efficiency:** Produces compact, skeletonized UI trees (`--skeleton`, `--compact`, `--interactive-only`) that consume fewer tokens than raw DOM dumps or screenshots.
3. **Safety & Policy Separation:** Enforces a strict separation between headless semantic mutations (`ValuePattern`, `InvokePattern`) and headed physical interactions (`SendInput`, cursor positioning).
4. **Native MCP Support (v1.2.0):** Features a dynamic MCP catalog (`src/mcp/catalog.rs`) reflecting leaf commands as MCP tools.

---

## 2. Directory Structure & Core Component Breakdown

```
integrations/agent-desktop/upstream/
├── Cargo.toml / Cargo.lock      # Rust workspace definition (edition 2021)
├── crates/
│   ├── core/                   # Platform-agnostic accessibility data structures & engine
│   │   ├── src/
│   │   │   ├── actionability/  # Element visibility, enabled state, clickable checks
│   │   │   ├── actions/        # Abstract action definitions (click, type, scroll, drag)
│   │   │   ├── adapter/        # Platform adapter trait (Windows, macOS, Linux)
│   │   │   ├── locator/        # Ref resolution, role/name/attribute selectors
│   │   │   ├── refs/           # Ephemeral @ref token generator and cache
│   │   │   ├── snapshot/       # Accessibility tree pruning, serialization, skeletonizer
│   │   │   ├── tree/           # In-memory accessibility node graph
│   │   │   └── wait/           # Polling and condition wait loops
│   ├── windows/                # Native Windows UI Automation & Win32 implementation
│   │   ├── src/
│   │   │   ├── actions/        # UIA pattern invocation (Invoke, Value, Toggle, Selection)
│   │   │   ├── input/          # Win32 SendInput wrappers for mouse and keyboard
│   │   │   ├── notifications/  # Windows notification listener and query
│   │   │   ├── system/         # Window enumeration (EnumWindows), display info, surfaces
│   │   │   ├── tree/           # UIA COM COM-tree walker and caching
│   │   │   └── adapter.rs      # WindowsPlatformAdapter implementation
│   ├── ffi/                    # C-ABI export bindings
│   ├── linux/                  # AT-SPI / D-Bus Linux implementation
│   └── macos/                  # NSAccessibility / CoreGraphics macOS implementation
├── npm/                        # Node.js binary distribution wrapper
│   ├── bin/agent-desktop       # Node entrypoint
│   └── lib/platform.js         # Tarball resolver and native executable locator
└── src/                        # CLI and Server Entrypoints
    ├── batch/                  # Bounded JSON batch command execution pipeline
    ├── cli/                    # CLI parsing via Clap
    ├── command_policy/         # Headed vs headless security policies
    ├── diagnostic/             # Environment, permissions, and session health checks
    ├── mcp/                    # Model Context Protocol stdio server implementation
    └── main.rs                 # Executable entrypoint
```

---

## 3. Comprehensive Feature Inventory & Compatibility Matrix

| Category | Upstream Feature | Upstream Implementation | SUBBU Classification | Integration Strategy & Implementation in SUBBU |
| :--- | :--- | :--- | :--- | :--- |
| **1. App Discovery** | `list-apps` | `EnumWindows` + Shell process matching | **Reuse Directly** | Routed through `agent-desktop-launcher.exe` to guarantee `WinSta0\Default` desktop station access. |
| **2. Window Mgmt** | `list-windows`, `focus-window`, `minimize`, `maximize`, `restore`, `resize-window`, `move-window` | Win32 `ShowWindow`, `SetForegroundWindow`, `SetWindowPos` | **Integrate via Adapter** | Exposed in SUBBU adapter and MCP layer for window focus and layout management. |
| **3. Display Mgmt** | `list-displays` | `EnumDisplayMonitors` | **Reuse Directly** | Used for multi-monitor coordinate normalization. |
| **4. UI Observation** | `snapshot` | UIA TreeWalker with `--skeleton`, `--interactive-only`, `--compact` | **Reuse Directly (Core)** | Foundation of SUBBU's Observe-Act-Verify loop. Delivers compact token-optimized JSON. |
| **5. Element Query** | `find`, `get`, `is` | UIA property conditions (Name, AutomationId, ClassName, ControlType) | **Adapt** | Query element state (`is visible`, `is enabled`, `get value`) to verify actions. |
| **6. Semantic Actions**| `set-value`, `clear`, `check`, `uncheck`, `toggle`, `select`, `expand`, `collapse` | UIA Control Patterns (`ValuePattern`, `TogglePattern`, `SelectionItemPattern`) | **Reuse Directly** | Preferred mutation mechanism for modern apps (Electron, WinUI, WPF) without stealing mouse. |
| **7. Physical Input** | `click`, `double-click`, `triple-click`, `right-click`, `type`, `press`, `hover`, `drag`, `scroll` | Win32 `SendInput` with desktop coordinate resolution | **Integrate via Adapter** | Requires `--headed` flag and foreground window focus. Wrapped in approval gates for high-risk actions. |
| **8. Low-level Input**| `mouse-move`, `mouse-down`, `mouse-up`, `mouse-click`, `mouse-wheel`, `key-down`, `key-up` | Direct virtual keycodes and cursor coordinates | **Not Required** | Higher-level semantic actions (`desktop_click`, `desktop_type`, `desktop_press`) are preferred for AI agents. |
| **9. App Lifecycle** | `launch`, `close-app` | Win32 `ShellExecuteEx` / `TerminateProcess` | **Adapt (Security Sandbox)** | Strict target executable whitelist (`notepad`, `calculator`, `explorer`, `chrome`, `code`). Prevents arbitrary process execution. |
| **10. System Surfaces**| `list-surfaces`, `open-system-surface` | Windows Start Menu, Taskbar, Action Center | **Adapt** | Safe introspection of Windows desktop shells. |
| **11. Notifications**| `list-notifications`, `dismiss-notification` | Windows Notification listener | **Integrate via Adapter** | Introspect Windows 11 toast notifications and alerts. |
| **12. Clipboard** | `clipboard-get`, `clipboard-set`, `clipboard-clear` | Win32 Clipboard API (`OpenClipboard`, `GetClipboardData`) | **Integrate via Adapter** | Safely managed with user confirmation for paste/overwrite. |
| **13. Visual Capture**| `screenshot` | Windows Graphics Capture / GDI `BitBlt` | **Adapt** | Optional multimodal visual verification fallback. |
| **14. Batch Execution**| `batch` | Bounded JSON command queue with transactional abort | **Integrate via Adapter** | Allows multi-step automation without repeated roundtrips. |
| **15. Diagnostics** | `status`, `permissions` | Probe UIA COM initialization and input permissions | **Reuse Directly** | Used in `AgentDesktopHealth.ts` to verify subshell desktop station integrity. |
| **16. Native MCP** | `agent-desktop mcp` | Dynamic stdio MCP server (v1.2.0) | **Integrate via Adapter** | Dynamic tool reflection combined with SUBBU's custom MCP security wrapper (`desktop-mcp-server.js`). |

---

## 4. Windows Platform Specifics & Window Station Nuances

1. **Window Station (`WinSta0\Default`):**
   - Headless background processes (e.g. background services or subshells) default to non-interactive window stations where `EnumWindows` and `SendInput` fail with access denied.
   - **Solution in SUBBU:** The compiled C# wrapper `agent-desktop-launcher.exe` explicitly invokes Win32 `SetProcessWindowStation` and `OpenDesktop("Default")` before spawning `agent-desktop.exe`, guaranteeing full interactive access.
2. **UIA COM Apartments:**
   - UI Automation COM calls must run on a Multi-Threaded Apartment (MTA) or CoInitialized thread. The Rust implementation manages this cleanly in `crates/windows/src/adapter.rs`.
3. **Legacy Win32 Controls vs. Modern XAML/WPF:**
   - In legacy controls (e.g. classic Notepad edit control), `ValuePattern` may return `POLICY_DENIED`. The adapter automatically falls back to headed `SendInput` with keyboard typing.

---

## 5. SUBBU Integration Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 SUBBU Frontend (React)                 │
                  │  (ThoughtBubble, TasksDrawer, ControlBar, Visual HUD)  │
                  └───────────────────────────▲────────────────────────────┘
                                              │ WebSocket / Events
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │            OpenClaw Gateway & Agent Runtime            │
                  │    (Ollama Qwen 3.5 / Tools / Task Orchestration)      │
                  └───────────────────────────▲────────────────────────────┘
                                              │ MCP Protocol (stdio JSON-RPC)
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │     SUBBU MCP Server (`desktop-mcp-server.js`)         │
                  │  - Security Whitelist & Argument Validation            │
                  │  - Observe -> Act -> Verify Pipeline                   │
                  │  - Tools: list_apps, snapshot, click, type, fill, etc. │
                  └───────────────────────────▲────────────────────────────┘
                                              │ Child Process Exec
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │       SUBBU Desktop Station Bridge Launcher            │
                  │             (`agent-desktop-launcher.exe`)             │
                  │  - Attaches to WinSta0\Default Interactive Desktop     │
                  └───────────────────────────▲────────────────────────────┘
                                              │ Spawns CLI Process
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │         Vercel Agent Desktop Native Engine             │
                  │     (crates/windows: UI Automation COM + SendInput)    │
                  └────────────────────────────────────────────────────────┘
```

The unified integration is implemented in:
- TypeScript Modules: `src/integrations/agent-desktop/`
- Node.js Adapter: `integrations/agent-desktop/adapter/`
- MCP Security Layer: `desktop-mcp-server.js`
- C# Desktop Station Bridge: `agent-desktop-launcher.exe`

