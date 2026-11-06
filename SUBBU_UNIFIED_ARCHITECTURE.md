# SUBBU — Unified System Architecture

**Author:** Principal Software Architect, SUBBU Project  
**Date:** 5 November 2026  
**Target Platform:** Windows 11 Home 64-bit, Intel i5-13420H, 16 GB RAM, NVIDIA RTX 3050 Laptop GPU (4 GB VRAM)  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  

---

## 1. System Vision & Architecture Hierarchy

SUBBU is a unified, local-first personal AI friend and desktop automation companion. The user never interacts with isolated sub-tools; all capabilities (voice, 3D character animation, desktop control, file management, model routing, and memory) operate under one coherent personality and presentation layer.

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  SUBBU Experience                      │
                                  │    (Personal AI Friend + Desktop Automation Companion) │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐             ┌───────────────────────────┐
      │   AI Friend & Character   │             │   Conversational Voice    │             │   Desktop Automation      │
      │ 3D VRM Stage, Expressions,│             │ Web Audio VAD, Streaming  │             │ Windows UIA, Agent Desktop│
      │ Gaze, Blink, Lip-Sync     │             │ STT / TTS, Barge-in       │             │ Observe-Plan-Act-Verify   │
      └─────────────┬─────────────┘             └─────────────┬─────────────┘             └─────────────┬─────────────┘
                    │                                         │                                         │
                    └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │            SubbuBackendAdapter & State Store           │
                                  │       (Zustand Store, Event Bus, Capability Router)    │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │                 OpenClaw Gateway                       │
                                  │   (Session Mgmt, Protocol v4, Approval Gates, Tools)   │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
      ┌───────────────────────────┐             ┌───────────────────────────┐             ┌───────────────────────────┐
      │   Local Model Runtime     │             │    Tool & MCP Bridges     │             │   Local State & Memory    │
      │ Ollama (qwen3.5:2b-q4_K_M)│             │ Desktop Station Launcher  │             │ SQLite DB, Workspace Files│
      │ 100% GPU offload, RTX 3050│             │ StdIO JSON-RPC MCP Server │             │ User Prefs & Session Log  │
      └───────────────────────────┘             └───────────────────────────┘             └───────────────────────────┘
```

---

## 2. Core Functional Pillars

### 2.1 AI Friend & 3D Companion System
- **Character Presentation:** Immersive 3D character rendered in Three.js via `@pixiv/three-vrm` on an ambient gradient stage with soft lighting and subtle particle effects.
- **Unified Character Controller:** A centralized orchestrator that coordinates decoupled sub-controllers:
  - `BlinkController`: Random natural blinking (2.0s–5.5s intervals) independent of facial emotions.
  - `GazeController`: Spherical interpolation tracking user mouse cursor or looking attentive during speech.
  - `EmoteController`: Smooth blendshape morphing for 12 character states (`idle`, `listening`, `thinking`, `speaking`, `happy`, `curious`, `surprised`, `concerned`, `explaining`, `greeting`, `task_success`, `task_error`).
  - `GestureController`: Natural arm and head procedural gestures.
  - `LipSyncController`: Real-time Web Audio FFT frequency formant extraction mapping speech audio to standard vowel blendshapes (`aa`, `ee`, `ih`, `oh`, `ou`).
- **Thought Isolation:** Internal reasoning tokens (`<think>...</think>`) are filtered before rendering. The companion displays clear, warm status tags (*"Thinking..."*, *"Checking..."*, *"Preparing..."*) without exposing raw chain-of-thought tokens.

### 2.2 Conversational & Voice Interaction
- **Input Pipeline:** Web Audio API with a 3-mode microphone control:
  1. *Push-to-Talk (PTT)*: Spacebar or hold-click for precise acoustic capture.
  2. *Voice Activity Detection (VAD)*: Hands-free conversation with acoustic threshold detection.
  3. *Continuous Listening*: Persistent conversation loop.
- **Audio Output & Barge-in:** When speech synthesis plays, incoming user audio triggers a barge-in event that immediately cancels speech synthesis, resets mouth blendshapes to neutral, and transitions the companion into the attentive `listening` state.
- **TTS Sanitization:** Cleans Markdown, raw URLs, and internal metadata so that spoken speech sounds natural.

### 2.3 Desktop Capability Manager & Computer Use
- **Observe $\rightarrow$ Plan $\rightarrow$ Act $\rightarrow$ Verify $\rightarrow$ Report:**
  1. *Observe:* Reads the native Windows accessibility tree via `IUIAutomation` COM interfaces using compact skeleton snapshots (`agent-desktop snapshot --skeleton -i --compact`).
  2. *Plan:* Determines appropriate control target and selects between semantic mutation (`ValuePattern`, `InvokePattern`) and headed physical simulation (`SendInput`).
  3. *Act:* Executes the action using snapshot-qualified `@ref` tokens.
  4. *Verify:* Takes a post-action snapshot to verify that the value was set or the window state transitioned.
  5. *Report:* Returns structured status to the agent; the 3D companion reacts accordingly (*happy* on verified success, *concerned* on failure).
- **Desktop Station Bridge:** All operations run through `agent-desktop-launcher.exe`, which attaches to the interactive user session (`WinSta0\Default`), preventing headless enumeration failures (`EnumWindows failed`).

### 2.4 Security & Safety Boundaries
- **Strict Execution Whitelist:** Only permitted applications can be launched: `notepad`, `calc`/`calculator`, `explorer`, `chrome`, and `code`.
- **Command Injection Immunity:** All tool invocations use direct Win32 `CreateProcess` via `child_process.execFile` with no shell intermediate. Shell chaining characters (`;`, `&`, `|`, `` ` ``, `$`, `%`) are rejected at the argument boundary.
- **Approval Gates:** High-risk actions (application launching, destructive file actions, clipboard modifications) trigger an explicit interactive confirmation modal (`ApprovalModal.tsx`) requiring user consent before execution.

---

## 3. Communication & Data Flow

```
User Voice / Text Request
          │
          ▼
FloatingComposer / MicButton
          │
          ▼
SubbuBackendAdapter
          │
          ├──────────────────────────────┐
          ▼                              ▼
CharacterController (Listening)   OpenClaw Gateway (ws://127.0.0.1:18789)
                                         │
                                         ▼
                                   Ollama Qwen 3.5
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
                Text Delta Stream                  Tool Call Request
                       │                                   │
                       ▼                                   ▼
                Emotion Parser                DesktopCapabilityManager
                       │                                   │
                       ▼                                   ▼
             CharacterController              Agent Desktop Launcher
          (Speaking, Emote, LipSync)          (Observe -> Act -> Verify)
                       │                                   │
                       ▼                                   ▼
               Live Screen Update                  Post-action Verification
```

