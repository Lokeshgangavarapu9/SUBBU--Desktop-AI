# SUBBU 2.0 — Master Desktop Functionality & Backend Integration Audit

**Date:** 2026-11-06  
**Auditor:** Senior Windows Desktop & AI Infrastructure Engineer  
**Target Environment:** Windows 11 Home (HP Victus 15, Intel Core i5-13420H, 16 GB RAM, NVIDIA RTX 3050 Laptop GPU, 4 GB VRAM)  
**Project Path:** `C:\Users\LOKESH\subbu 2.0`  

---

## 1. Executive Architecture & Source Code Inspection

A line-by-line inspection of all frontend React components, hooks, stores, and the Tauri Rust backend was completed. While the application launches cleanly with a polished Sakura & Pearl aesthetic, substantial portions of the runtime features are superficial, contain hardcoded mock states, lack event handlers, or fail to connect user actions to real backend execution.

### Key Discoveries & Root Causes

1. **Canned Chat & Floating Assistant Message Glitch:**
   - The initial Zustand store (`src/store/useSubbuStore.ts`) seeds `messages` with a static welcome message (`welcome-msg`).
   - `LiveCaptionCard.tsx` searches for the last assistant message and displays it permanently in a floating capsule above the composer on the home stage whenever the chat drawer is closed.
   - When a user previously asked about external browser/YouTube actions, fallback agents or OpenClaw returned an unhelpful canned refusal.
   - The message sending pipeline (`FloatingComposer.tsx` -> `SubbuBackendAdapter.ts`) lacked multi-turn conversation memory, passing only isolated single-string prompts to Ollama without prior context.

2. **Superficial Connection & Health Indicators:**
   - `TopStatusCapsule.tsx` reports `Connected` solely based on WebSocket connection status to OpenClaw. It does not independently verify Ollama HTTP health, model readiness, or local inference response.
   - The Model badge in the top capsule is a static `div` with no click handler or switcher, ignoring user requests to view or select alternative installed models.

3. **Dashboard & Analytical Charts Deficiencies:**
   - `SystemStatusModal.tsx` renders a hardcoded list of 11 services and 8 pipelines with static `'PASS'` or `'CONNECTED'` strings regardless of actual runtime states.
   - There are zero interactive analytical charts. Metrics such as conversations count, messages count, and system memory are either absent or hardcoded (e.g., `ram_used_gb: 15.0`).
   - Diagnostic exports generate fabricated hardware strings instead of querying real system APIs.

4. **Incomplete Voice & Transcription Studio:**
   - In `RightContextDrawer.tsx`, opening the `voice` drawer rendered a static 3-line paragraph: `"Voice is active and synchronized with Subbu."` with no interactive controls.
   - There is no recording duration counter, no start/stop/cancel recording button inside the drawer, no editable transcript preview, and no direct transcription-to-model submission loop.

5. **Disconnected Specialist Agents:**
   - `AgentsDrawer.tsx` permits clicking "Select" on `Subbu Core`, `Code Specialist`, and `Research Specialist`, updating `activeAgentId` in Zustand.
   - However, `activeAgentId` is never referenced anywhere in `FloatingComposer.tsx`, `SubbuBackendAdapter.ts`, or `OllamaClient.ts`. The prompt is sent with a single generic system prompt regardless of which specialist is active.

6. **Hardcoded Mock Memories without Persistence:**
   - `useSubbuStore.ts` initializes with 2 fabricated memories (regarding user preferences and RTX 3050 hardware).
   - `MemoryDrawer.tsx` lacks an "Add Memory" form, lacks an "Edit Memory" action, lacks delete confirmation dialogs, and does not persist changes to `localStorage` or disk. On reload, all edits are lost.

7. **Workspace Files Attachment Dead-End:**
   - `FilesDrawer.tsx` and `FloatingComposer.tsx` allow selecting files and store `File` objects in `attachedFiles`.
   - However, `FloatingComposer.handleSend()` never extracts or reads the file content. The prompt sent to `adapter.sendMessage()` completely ignores attached files.

8. **Settings & Telemetry Gaps:**
   - `SettingsModal.tsx` provides a "Test Ollama" button but lacks a "Test OpenClaw" button.
   - Connection URL inputs have no URL validation.
   - Applied configurations are stored only in volatile in-memory state and reset on application restart.

---

## 2. Master Functionality Audit Table

| Feature | Frontend File(s) | Backend / Service | Actual Status | Required Fix |
|---|---|---|---|---|
| **Chat: Multi-turn Messaging** | `FloatingComposer.tsx`, `ChatDrawer.tsx` | `SubbuBackendAdapter.ts`, `ollamaClient.ts` | **PARTIAL**: Single-turn prompt sent to Ollama `/api/generate`; previous messages ignored. | Upgrade to Ollama `/api/chat` with complete multi-turn message history context and active agent system prompt. |
| **Chat: Assistant Message Actions** | `ChatDrawer.tsx` | `voiceManager.ts`, Web Clipboard | **PARTIAL**: Only Speak and Copy implemented; no Regenerate, no Stop Speaking. | Add Regenerate action, Stop Speaking toggle, and clean action button tooltips. |
| **Chat: User Message Actions** | `ChatDrawer.tsx` | `useSubbuStore.ts` | **BROKEN**: No user message actions exist (no Copy, no Edit & Resend). | Add Copy and inline Edit & Resend action on all user message bubbles. |
| **Chat: Session Management** | `ChatDrawer.tsx` | `useSubbuStore.ts` | **BROKEN**: Creating a new session does not isolate messages; all sessions share one flat message list. | Scope messages by `sessionId`, add session deletion with confirmation, and add conversation clear with confirmation. |
| **Home Stage Caption** | `LiveCaptionCard.tsx` | `useSubbuStore.ts` | **BUGGY**: Displays old assistant message permanently on home stage. | Add dismiss button, auto-fade after completion, or restrict to real-time active streaming. |
| **Connection Health Check** | `TopStatusCapsule.tsx`, `StatusBadge.tsx` | `ollamaClient.ts`, `main.rs` IPC | **SUPERFICIAL**: Only checks OpenClaw WS state; ignores Ollama HTTP health and model readiness. | Implement unified real-time multi-service health checker (Ollama HTTP + Model Loaded + OpenClaw WS + Host IPC). |
| **Model Selector** | `TopStatusCapsule.tsx` | `ollamaClient.ts` | **BROKEN**: Model badge is a static unclickable `div`. | Convert into interactive clickable selector modal/menu to switch between installed Ollama models. |
| **System Dashboard & Charts** | `SystemStatusModal.tsx` | `main.rs` (`get_system_telemetry`) | **MOCK DATA**: Hardcoded static text arrays; no real charts; hardcoded 15.0 GB RAM. | Build real ChatGPT-style analytical charts (activity, message volume, VRAM, real RAM via Win32 `GlobalMemoryStatusEx`). |
| **Voice & Call Studio** | `RightContextDrawer.tsx`, `voiceManager.ts` | Web Speech API / MediaStream | **MISSING**: Rendered only a static 3-line paragraph; no recording or transcript interface. | Build full `VoiceDrawer.tsx` with mic permissions, live duration, waveform, editable transcript, send-to-model, and TTS controls. |
| **Specialist Agents** | `AgentsDrawer.tsx` | `ollamaClient.ts`, `SubbuBackendAdapter.ts` | **NO EFFECT**: Selection changes state but prompt execution ignores the selected agent. | Inject distinct specialized system prompts and parameters for Subbu Core, Code Specialist, and Research Specialist. |
| **Companion Memory** | `MemoryDrawer.tsx` | Local Storage / Disk Persistence | **MOCK DATA**: 2 hardcoded fake memories; no Add, no Edit, no delete confirmation, no persistence. | Remove mock data, implement Add Memory form, Edit inline, Delete confirmation, and persistent storage across restarts. |
| **Workspace Files** | `FilesDrawer.tsx`, `FloatingComposer.tsx` | `FileReader` API | **DISCONNECTED**: Attached files are stored in state but never read or injected into prompt. | Read text/code/document content via `FileReader`, attach formatted context to model prompt, and add file removal in drawer. |
| **Settings & Telemetry** | `SettingsModal.tsx` | `useSubbuStore.ts`, Tauri IPC | **PARTIAL**: No "Test OpenClaw" button; no URL validation; settings reset on app reload. | Add URL regex validation, real OpenClaw test probe, and persist non-secret settings to `localStorage`. |
| **Sidecar Automation** | `DesktopCapabilityManager.ts` | `agent-desktop-launcher.exe` | **VERIFIED**: Launcher binary exists and executes via Tauri IPC. | Connect to approval flow for sensitive desktop operations. |

---

## 3. Detailed Component & Integration Findings

### 3.1 Chat System & Fallback Handling
- **Root Cause of Refusal Messages:** When the user asked desktop or browsing questions while connected to the gateway, OpenClaw returned canned responses when tools were disabled or failed.
- **Remediation:** In `SubbuBackendAdapter.ts`, when direct Ollama inference is used, integrate tool augmentation or clear local desktop launching capabilities via `execute_desktop_command` and `open_application`. Support multi-turn message history via `/api/chat` with configurable agent system instructions.

### 3.2 Voice & Call Studio
- **WebView2 Speech Support:** In Windows WebView2, `window.SpeechRecognition` depends on Windows online speech services which may be unavailable offline.
- **Remediation:** Provide clear diagnostic feedback if `SpeechRecognition` is unavailable. Support live audio recording via `MediaRecorder` + Web Audio API analyser, show the live audio waveform and recording timer, provide an editable transcript input, and seamlessly wire TTS speech via `window.speechSynthesis`.

### 3.3 System Dashboard & Analytical Charts
- **Requirement:** Clean, professional charts with visible axes, labels, legends, tooltips, responsive sizing, proper empty states, and correct data sources.
- **Remediation:** Implement responsive SVG-based analytical charts (Volume Trend, Token Latency, RAM/VRAM Utilization) adhering to the soft pearl & sakura theme. Bind metrics to actual stored sessions, messages, and live Win32 memory status from Tauri IPC.

### 3.4 Security & Secrets Integrity
- **No Token Leaks:** The gateway loopback bridge in `main.rs` remains untouched and secure, injecting credentials on the native side.
- **Settings Persistence:** Store only non-secret configuration (`openclawWsUrl`, `openclawHttpUrl`, `ollamaUrl`, `currentModelName`) in local storage. Never store raw auth tokens in browser storage.

---

## 4. Implementation Plan & Execution Phases

1. **Phase 1: Chat Architecture & Multi-turn Engine:**
   - Upgrade `ollamaClient.ts` and `SubbuBackendAdapter.ts` to support multi-turn history via `/api/chat`.
   - Update `useSubbuStore.ts` to associate messages with `sessionId`.
   - Enhance `ChatDrawer.tsx` with user actions (Copy, Edit & Resend), assistant actions (Copy, Regenerate, Read Aloud / Stop), session deletion, and clearing.
   - Fix `LiveCaptionCard.tsx` to prevent permanent display of stale messages.

2. **Phase 2: Specialist Agent Personas & Real Routing:**
   - Configure distinct system prompts and temperature/top_p profiles for `main`, `coder`, and `researcher`.
   - Connect `activeAgentId` in `FloatingComposer.tsx` and `SubbuBackendAdapter.ts`.

3. **Phase 3: Real Voice & Call Studio Drawer:**
   - Create `src/components/drawers/VoiceDrawer.tsx`.
   - Wire microphone permission request, audio level meter, recording timer, editable transcript, and direct "Send to Subbu" action.

4. **Phase 4: Companion Memory Management:**
   - Remove fake hardcoded memories from `useSubbuStore.ts`.
   - Add Add/Edit/Delete Memory dialogs with persistent `localStorage` synchronization.

5. **Phase 5: Workspace File Content Processing:**
   - Read file text content (`.txt`, `.md`, `.json`, `.csv`, `.js`, `.ts`, `.py`, `.rs`, `.html`, etc.) in `FloatingComposer.tsx` and prepend context blocks to the model prompt.
   - Add remove buttons in `FilesDrawer.tsx`.

6. **Phase 6: Analytical Dashboard & Real Telemetry:**
   - In `src-tauri/src/main.rs`, query actual Windows RAM via `GlobalMemoryStatusEx`.
   - Rebuild `SystemStatusModal.tsx` with real metrics and professional responsive SVG charts.

7. **Phase 7: Settings & Top Status Capsule Improvements:**
   - Add "Test OpenClaw" probe, URL validation, and persistent settings storage.
   - Make the model badge in `TopStatusCapsule.tsx` a clickable selector with a model switching menu.

8. **Phase 8: Validation & Verification:**
   - Verify TypeScript compilation (`npm run build`).
   - Run Rust check (`cargo check --manifest-path src-tauri/Cargo.toml`).
   - Run automated E2E tests against the built desktop application.
   - Generate `SUBBU_FUNCTIONALITY_REPAIR_REPORT.md`.

