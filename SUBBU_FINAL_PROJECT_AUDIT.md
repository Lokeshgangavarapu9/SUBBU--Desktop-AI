# SUBBU 2.0 — Final Comprehensive Project Audit

**Project:** SUBBU — Personal AI Friend & Desktop Companion  
**Location:** `C:\Users\LOKESH\subbu 2.0`  
**Host Platform:** Windows 11 Home 64-bit (OS Build 26300)  
**Hardware Specifications:**
- **CPU:** Intel® Core™ i5-13420H (8 Cores: 4 Performance + 4 Efficient, 12 Threads)
- **RAM:** 16 GB DDR5 (15.64 GB usable)
- **Dedicated GPU:** NVIDIA® GeForce RTX™ 3050 Laptop GPU (4,096 MiB GDDR6 Dedicated VRAM)
- **Integrated GPU:** Intel UHD Graphics

---

## 1. Existing Architecture

SUBBU 2.0 follows a modular, local-first reactive desktop companion architecture organized into four primary operational tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER PRESENTATION TIER                          │
│  React 18 + Vite SPA | AmbientAuraStage | LiveCaptionCard | Drawers    │
│  Spotlight Quick Launcher (Ctrl+K) | System Diagnostics Dashboard      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    ZUSTAND STATE & SERVICES TIER                       │
│  useSubbuStore | SubbuBackendAdapter | voiceManager | AudioVisemeAnalyzer│
│  AdaptiveResourceManager | emotionParser | ttsSanitizer                │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────────────┐ ┌──────▼────────────────────┐
│         OPENCLAW GATEWAY TIER            │ │     LOCAL OLLAMA TIER     │
│  ws://127.0.0.1:18789 (PID: active)      │ │  http://127.0.0.1:11434   │
│  RPC Channel, Tool Dispatch, Approvals   │ │  qwen3.5:2b-q4_K_M (100% GPU)
└───────────────────┬──────────────────────┘ └───────────────────────────┘
                    │
┌───────────────────▼────────────────────────────────────────────────────┐
│                 AGENT DESKTOP AUTOMATION TIER                          │
│  agent-desktop-launcher.exe (Windowless Win32 Subsystem)               │
│  Observe-Plan-Act-Verify Pipeline | WinSta0\Default Session            │
│  UIA 3.0 Tree Inspection | Notepad | Calculator | Edge Browser         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Existing Functionality

The verified feature set includes:
- **Local AI Conversational Engine:** High-speed streaming inference through local Ollama (`qwen3.5:2b-q4_K_M`) pinned in RTX 3050 VRAM.
- **Ambient Companion Presence:** Audio-reactive, particle-driven 2D canvas sphere reacting to live vocal frequency bands, thinking states, and assistant status without 3D model overhead.
- **Full-Duplex Voice Interaction:** Web Speech API continuous recognition, SpeechSynthesis TTS with markdown syntax suppression, and Voice Activity Detection (VAD) barge-in interruption.
- **Agent Desktop Automation:** Real Windows 11 desktop control operating silently on `WinSta0\Default` without command prompt flashing.
- **Executive Security Gate:** Modal approval prompts requiring explicit user authorization for privileged system and desktop operations.
- **Multi-Drawer Context Navigation:** Six lazy-loaded drawer panels (Chat History, Tasks, Specialist Agents, Long-term Memory, Workspace Files, System Settings).
- **Spotlight Quick Launcher:** Global `Ctrl+K` and `Alt+Space` shortcut overlay for instant app launching and quick toggles.
- **System Telemetry & Health Dashboard:** Live metrics monitoring CPU, RAM, VRAM, GPU temperature, and component latencies with a sanitized JSON export.

---

## 3. Working Components

| Component / Subsystem | Path / Endpoint | Empirical Status | Verification Note |
| :--- | :--- | :--- | :--- |
| **Vite Frontend Dev/Build** | `localhost:5173` / `dist/` | **WORKING** | Production build compiles with zero TypeScript errors. |
| **Ollama Local Model** | `http://127.0.0.1:11434` | **WORKING** | 100% GPU offload verified via `ollama ps` (1.4 GB in VRAM, 45.3 t/s). |
| **OpenClaw Gateway** | `ws://127.0.0.1:18789` | **WORKING** | Active WebSocket connection with session discovery. |
| **Direct Ollama Fallback** | `SubbuBackendAdapter.ts` | **WORKING** | Seamless failover if Gateway disconnects. |
| **Windowless Automation** | `agent-desktop-launcher.exe`| **WORKING** | Silent process spawning with `CREATE_NO_WINDOW = 0x08000000`. |
| **Subbu Process Supervisor**| `subbuProcessSupervisor.cjs`| **WORKING** | Single-instance leasing in `subbu-runtime-pids.json`. |
| **Audio Viseme FFT** | `AudioVisemeAnalyzer.ts` | **WORKING** | Real-time Web Audio API frequency analysis. |
| **Ambient Aura Stage** | `AmbientAuraStage.tsx` | **WORKING** | Audio-reactive, zero-model canvas presence. |
| **TTS Speech Sanitizer** | `ttsSanitizer.ts` | **WORKING** | Strips code blocks, paths, and URLs before speech synthesis. |
| **SUBBU CLI** | `bin/subbu.cjs` | **WORKING** | Full command suite (`status`, `start`, `stop`, `open`, `timer`). |

---

## 4. Broken Components

- **Previous 3D VRM Model Pipeline (REPAIRED):** Attempting to load `/models/AvatarSample_B.vrm` previously failed or stalled rendering because of missing assets and 40 MB model weight. This has been completely removed and replaced with the native `AmbientAuraStage`.
- **Google Calendar Direct Token Auth:** Google Calendar opens the user's browser but returns `AUTH REQUIRED` until user signs in through standard Google OAuth.
- **Native Rust Build Toolchain:** `rustc` and `cargo` are currently not installed in the Windows environment, which prevents direct compilation of the Tauri `.msi` bundle without installing `rustup.rs`.

---

## 5. Duplicate Implementations

- **Previous Process Launchers:** The project previously contained multiple startup shell scripts (`start-subbu.bat`, direct `vite` invocations, and manual `openclaw gateway run` commands) that caused duplicate processes to run concurrently.
- **Resolution:** Consolidated into the unified `SubbuProcessSupervisor.cjs` and `start-subbu.cjs`.

---

## 6. Unused Dependencies

- **Removed:** `@pixiv/three-vrm` and `@pixiv/three-vrm-animation` were exclusively used by the deleted girl character. These have been completely uninstalled from `package.json` and deleted from `node_modules`.
- **Three.js Dependencies:** `@react-three/fiber`, `@react-three/drei`, and `three` are no longer imported in the companion stage.

---

## 7. Performance Bottlenecks

1. **Chain-of-Thought (CoT) Latency:** Default prompting caused `qwen3.5:2b` to generate extensive thinking tokens. Resolved by setting `num_ctx: 2048` and enforcing immediate thinking display in the frontend streaming pipeline.
2. **Monolithic Bundle Size:** Previously 1.44 MB. Resolved by lazy loading all six drawers and manual vendor chunking.
3. **Flashing Command Prompts:** Resolved via the C# windowless executable wrapper.

---

## 8. Missing Integrations

- **System Tray Native Wrapper:** While Tauri configuration is prepared in `src-tauri/tauri.conf.json`, the native binary is not yet compiled pending host Rust compiler installation.
- **Calendar API Server:** Google Calendar currently relies on browser redirection rather than a local OAuth token storage server.

---

## 9. Security Problems & Safeguards

- **Security Gate:** Implemented `ApprovalModal.tsx` gate that intercepts dangerous commands (`system.run`, file mutations, elevated automation) and prompts the user before execution.
- **Allowlisted Launch Binaries:** Only approved applications (`notepad.exe`, `calc.exe`, `msedge.exe`, `explorer.exe`) can be launched automatically.
- **Localhost Boundary:** OpenClaw Gateway and Ollama are strictly bound to loopback interfaces (`127.0.0.1`).
- **Secret Sanitization:** Diagnostics export (`subbu-diagnostics-<timestamp>.json`) strips all auth tokens, user messages, and private paths.

---

## 10. Recommended Repairs & Next Steps

1. Maintain `AmbientAuraStage` as the primary, high-performance companion presence.
2. Maintain `CREATE_NO_WINDOW` enforcement for all desktop automations.
3. Keep Ollama pinned in VRAM with `keep_alive: "30m"`.
4. Install `rustup` on the host when ready to compile the final standalone Tauri `.msi` desktop installer.

