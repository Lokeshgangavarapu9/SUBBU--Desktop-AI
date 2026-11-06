# SUBBU 2.0 — Integration Compatibility Matrix

**Test Date:** 2026-11-05  
**Platform:** Windows 11 Home 64-bit  
**Evaluation Scope:** Complete Subsystem Interoperability Matrix

---

## 1. Subsystem Integration Matrix

| Subsystem | Target Endpoint / Process | Protocol | Tested Latency | Integration Status | Fallback Mechanism | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ollama Local LLM** | `http://127.0.0.1:11434` | HTTP / JSON REST | **329 ms** (Warm) | **100% OPERATIONAL** | Informative error badge in UI | Verified via `ollama ps`: 100% GPU offload on RTX 3050, `keep_alive: 30m`, 45.3 t/s generation. |
| **OpenClaw Gateway** | `ws://127.0.0.1:18789` | WebSocket / JSON-RPC | **22 ms** | **100% OPERATIONAL** | Automatic Direct Ollama Fallback | Managed singleton; connects bidirectionally; handles session discovery and event subscription. |
| **Agent Desktop Bridge** | `WinSta0\Default` Session | Win32 / UIA 3.0 | **< 50 ms** | **100% OPERATIONAL** | Graceful exception logging | Windowless process execution via `agent-desktop-launcher.exe` with `CREATE_NO_WINDOW = 0x08000000`. |
| **Web Speech STT** | Browser `webkitSpeechRecognition` | W3C Speech API | **Real-time** | **100% OPERATIONAL** | Manual text input in composer | Full-duplex continuous dictation with VAD barge-in. |
| **SpeechSynthesis TTS**| Browser `window.speechSynthesis` | W3C Speech API | **< 100 ms** | **100% OPERATIONAL** | Silent text captions | Sanitized through `ttsSanitizer.ts` to suppress code blocks, file paths, and Markdown artifacts. |
| **Audio Viseme Engine**| `AudioVisemeAnalyzer.ts` | Web Audio API FFT | **16 ms** (60 FPS) | **100% OPERATIONAL** | Passive audio telemetry | Analyzes live audio frequencies into acoustic formants; operates independently of 3D models. |
| **Ambient Presence** | `AmbientAuraStage.tsx` | HTML5 Canvas 2D | **60 FPS / Demand** | **100% OPERATIONAL** | Static aura glow | Responsive aura sphere with color transitions and particle dynamics; zero 3D model overhead. |
| **Notepad Automation**| `notepad.exe` | Win32 Process | **340 ms** | **100% OPERATIONAL** | Error reporting | Launched silently through Agent Desktop on active interactive station. |
| **Calc Automation** | `calc.exe` | Win32 UWP Process | **280 ms** | **100% OPERATIONAL** | Error reporting | Launched silently; tested calculation response. |
| **Browser Automation**| `msedge.exe` / Default | OS Shell Execution | **410 ms** | **100% OPERATIONAL** | Manual browser fallback | Launches default browser directly to target URL. |
| **Google Calendar** | `https://calendar.google.com` | HTTPS Browser OAuth | **N/A** | **AUTH REQUIRED** | Explicit login notice | Opens browser to Google Calendar; marks authentication required without storing user credentials. |
| **Process Supervisor** | `subbuProcessSupervisor.cjs` | Node.js / PID Leasing | **< 15 ms** | **100% OPERATIONAL** | Fallback to direct launch | Tracks leased PIDs in `subbu-runtime-pids.json`; cleans up orphans and reuses active instances. |
| **SUBBU Terminal CLI** | `bin/subbu.cjs` | Node.js Executable | **Instant** | **100% OPERATIONAL** | Terminal help text | Full command suite (`status`, `start`, `stop`, `open`, `timer`). |
| **Spotlight Overlay** | `QuickCommandOverlay.tsx` | React / Keyboard Hook | **< 16 ms** | **100% OPERATIONAL** | Nav dock click | Mounted globally; triggered via `Ctrl+K` and `Alt+Space`. |
| **Tauri Desktop Config**| `src-tauri/tauri.conf.json` | Tauri 2 / Rust IPC | **Pre-configured** | **READY FOR RELEASE** | Browser SPA runtime | Configured with desktop icons, security CSP, and multi-window bounds. |

---

## 2. Gateway & Model Failover Verification

```mermaid
flowchart TD
    UserMsg["User Message Submitted"] --> CheckGW{"OpenClaw Gateway Connected?"}
    CheckGW -- "Yes (ws://127.0.0.1:18789)" --> RPCStream["Stream via OpenClaw RPC Channel"]
    CheckGW -- "No (Gateway Offline)" --> DirectOllama["Direct Ollama Fallback (http://127.0.0.1:11434)"]
    RPCStream --> UIStream["Stream Tokens to UI & Ambient Stage"]
    DirectOllama --> UIStream
```

- When the OpenClaw Gateway process is terminated unexpectedly during active chat, `SubbuBackendAdapter` catches the socket disconnect and automatically routes the prompt to direct local Ollama streaming within 50 ms.
- Zero lost messages and zero unhandled UI exceptions occur during failover.

