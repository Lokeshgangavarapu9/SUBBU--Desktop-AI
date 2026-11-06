# SUBBU — REMAINING WORK & ROADMAP

**Document Date:** November 5, 2026  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  
**Status:** Core Unified System Fully Operational  

---

## 1. Current State Assessment

The core mission of unifying SUBBU's frontend, backend, 3D character engine, OpenClaw orchestration, Ollama local model inference, and desktop automation into a single, cohesive Windows 11 companion is **complete and verified**.

All critical execution paths (Pipelines A through F) are operational.

---

## 2. Completed Milestones (Current Baseline)

- [x] **Universal Frontend UI:** Cyberpunk-zen glassmorphic React 19 interface with floating composer, left navigation dock, status capsule, and context drawers.
- [x] **Decoupled 3D Stage:** Procedural blinking, spherical eye tracking, formant-based viseme lip-sync, breathing, and 14 humanoid gestures coordinated without channel collision.
- [x] **Private Thinking Filter:** Secure parsing and display of `<think>...</think>` internal tokens in a dedicated thought bubble, keeping conversational captions clean.
- [x] **OpenClaw Protocol v4:** Live WebSocket handshake with token authentication, event streaming, and capability negotiation.
- [x] **Local GPU AI Inference:** Zero-cloud dependency; Ollama running Qwen 2B on RTX 3050 Laptop GPU at ~42 tokens/second.
- [x] **Windows Desktop Station Bridge:** Process attachment to `WinSta0\Default`, enabling headless subshell interaction with native Win32/UIA applications.
- [x] **Observe-Plan-Act-Verify Loop:** Live accessibility tree inspection, reference targeting (`@ref`), headed typing, semantic invoke fallback, and post-action verification.
- [x] **Security Gatekeeper:** Binary whitelisting and strict parameter sanitization to prevent unauthorized execution or shell injection.

---

## 3. Recommended Future Enhancements (Post-Milestone Roadmap)

The following items are optional quality-of-life and performance optimizations for subsequent update cycles:

### Milestone 2: Speech Quality & Neural TTS (Non-blocking)
- **Current State:** Relies on Web Speech API (`SpeechSynthesis` & `SpeechRecognition`), which works natively in all modern Chromium-based web views and browsers.
- **Future Enhancement:**
  - Package an optional on-device offline Piper TTS or Sherpa-ONNX model for ultra-realistic custom voice timbre.
  - Implement local Whisper.cpp or WebGPU-based Whisper for zero-network speech-to-text with higher punctuation accuracy.

### Milestone 3: Chunking & Bundle Optimization (Non-blocking)
- **Current State:** Vite production build bundles into a single primary chunk (`1.43 MB` minified, `399 kB` gzipped), compiling cleanly in ~25 seconds.
- **Future Enhancement:**
  - Configure `manualChunks` in `vite.config.ts` to separate `@react-three/fiber`, `three`, and `@pixiv/three-vrm` into vendor chunks.
  - Apply dynamic `import()` on heavy secondary context drawers (`FilesDrawer`, `MemoryDrawer`).

### Milestone 4: Multi-Monitor & DPI Scaling Enhancements (Non-blocking)
- **Current State:** Window tracking and coordinate normalization handle the primary display resolution (1920x1080 at standard DPI).
- **Future Enhancement:**
  - Add multi-monitor virtual screen boundary calculations (`GetSystemMetrics(SM_CXVIRTUALSCREEN)`) when automating secondary monitors with non-100% DPI scaling.

### Milestone 5: Vector Database Long-Term Memory (Non-blocking)
- **Current State:** In-memory and local JSON persistence with regex and keyword search in `MemoryDrawer.tsx`.
- **Future Enhancement:**
  - Integrate an embedded SQLite-vec or ChromaDB instance for semantic vector similarity retrieval of past conversation history.

---

## 4. Operational Maintenance Checklist

For daily operation of the unified SUBBU system:
1. **Ollama:** Ensure `ollama serve` is running (typically runs automatically as a Windows tray service).
2. **OpenClaw Gateway:** Run `openclaw gateway run` (or let the background service run on port 18789).
3. **SUBBU Client:** Run `npm run dev` in `C:\Users\LOKESH\subbu 2.0` (accessible at `http://localhost:5173`).

