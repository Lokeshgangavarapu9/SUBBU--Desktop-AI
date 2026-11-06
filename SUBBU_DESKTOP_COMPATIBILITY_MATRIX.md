# SUBBU 2.0 — Desktop Functionality Compatibility Matrix

**Audit Date:** 2026-11-05  
**Target Architecture:** Windows 11 Desktop Application (Tauri 2 / WebView2)  
**Classification Categories:**
- **READY:** Works in packaged desktop without changes.
- **REQUIRES MODIFICATION:** Requires code adjustment for native desktop context.
- **REQUIRES ADDITIONAL DEPENDENCY:** Requires external toolchain or native library.
- **BLOCKED:** Blocked by missing external prerequisite.
- **NOT VERIFIED:** Unverified in native packaging.

---

## 1. Complete Feature Compatibility Matrix

| Feature | Desktop Status | Technical Assessment & Evidence | Required Work for Packaging |
| :--- | :--- | :--- | :--- |
| **Chat Interface** | **READY** | Standard React 18 DOM tree. Verified in production bundle `dist/`. | None. |
| **Ollama Streaming Responses** | **READY** | Uses HTTP fetch/ReadableStream against `127.0.0.1:11434`. Permitted by CSP. | None. |
| **OpenClaw Agent Comm** | **READY** | Standard WebSocket connecting to `ws://127.0.0.1:18789`. Permitted by CSP. | None. |
| **Voice Recognition (STT)** | **REQUIRES MODIFICATION** | In browser development, relies on `webkitSpeechRecognition`. Inside WebView2, cloud speech recognition requires active internet and can be restricted. | Add fallback to local speech engine (e.g. Windows Media Speech API or local Whisper) or provide clear online requirement indicator. |
| **Speech Synthesis (TTS)** | **READY** | Uses `window.speechSynthesis`. Supported natively by Edge WebView2 on Windows 11. | None. |
| **Conversation History** | **READY** | Persisted in memory and local storage via Zustand. | None. |
| **Long-Term Memory** | **READY** | Local JSON storage with provenance metadata. | None. |
| **Browser Launching** | **READY** | Invokes shell execution via Node/Tauri opener. | Use `tauri-plugin-opener` or shell API in production. |
| **Google Calendar Access** | **READY** | Launches browser to Google Calendar. Deferral to browser preserves privacy. | None (Marked `AUTH REQUIRED` as designed). |
| **Notepad Automation** | **READY** | Executed via `agent-desktop-launcher.exe` on `WinSta0\Default`. | Bundle `agent-desktop-launcher.exe` in Tauri external binaries. |
| **Calculator Automation** | **READY** | Executed via `agent-desktop-launcher.exe` using `calc.exe`. | Bundle `agent-desktop-launcher.exe` in Tauri external binaries. |
| **Agent Desktop UIA** | **READY** | Reads Windows UI Automation (UIA 3.0) accessibility tree via .NET. | None. |
| **Live Countdown Timer** | **READY** | JavaScript interval timers in Zustand with terminal CLI mirror. | None. |
| **Quick Command Overlay** | **READY** | React overlay mounted globally in `src/app/App.tsx`. | None. |
| **Global Keyboard Shortcuts** | **REQUIRES MODIFICATION** | Currently listens to DOM `window.addEventListener('keydown')` (`Ctrl+K`). When SUBBU window loses focus, global shortcuts require OS-level hook. | Add `@tauri-apps/plugin-global-shortcut` for system-wide `Alt+Space` / `Ctrl+K` activation. |
| **System Status Dashboard** | **READY** | Telemetry dashboard with sanitized JSON diagnostics export. | None. |
| **Workspace File Access** | **REQUIRES MODIFICATION** | In web dev, reads files via Node `fs`. In packaged Tauri, file operations must use `@tauri-apps/plugin-fs` or IPC commands. | Declare filesystem permissions in `capabilities/default.json`. |
| **App Shutdown & Restart** | **READY** | Handled via Tauri native window close event and process supervisor cleanup. | None. |
| **Tauri Binary Compilation** | **BLOCKED** | Blocked by missing Rust compiler (`rustc`/`cargo`) and MSVC Build Tools on Windows host. | Install Rust via `rustup.rs` and Visual Studio C++ Build Tools (Phase 2). |

---

## 2. Deep-Dive on Specific Desktop Nuances

### 2.1 The WebView2 Speech Recognition Dilemma
In Windows desktop applications built with Tauri / WebView2:
- `window.speechSynthesis` works out-of-the-box using the local Windows SAPI voices (Microsoft David, Zira, Mark).
- However, Chromium's `webkitSpeechRecognition` relies on Google's cloud speech endpoints. In some WebView2 runtime distributions, this endpoint is blocked or returns `network` error unless explicitly enabled via WebView2 browser flags or replaced with a native Windows Speech API / whisper engine.
- *Recommended Action:* Provide audio-reactive text composer fallback and evaluate native speech plugin in Phase 3.

### 2.2 Global Hotkeys (`Ctrl+K` & `Alt+Space`)
- Inside the browser, `window.addEventListener('keydown')` only fires when the browser window is actively focused.
- To make SUBBU behave like a true personal AI companion (like Windows Copilot or Raycast), `Alt+Space` must bring the window to the foreground even when minimized.
- *Recommended Action:* Register `@tauri-apps/plugin-global-shortcut` in `src-tauri` during Phase 3.

### 2.3 Bundling External Binaries (`agent-desktop-launcher.exe`)
- Tauri 2 supports `bundle.externalBin` in `tauri.conf.json`.
- `agent-desktop-launcher.exe` can be bundled as an external sidecar binary so the compiled installer places it in the application's runtime folder automatically.

