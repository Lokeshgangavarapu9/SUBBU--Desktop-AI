# SUBBU — Comprehensive Master Repository Analysis

**Author:** Principal Software Architect, SUBBU Project  
**Date:** 5 November 2026  
**Primary Host:** Windows 11 Home 64-bit, Intel i5-13420H, 16 GB RAM, NVIDIA RTX 3050 Laptop GPU (4 GB VRAM)  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion (`C:\Users\LOKESH\subbu 2.0`)  

---

## Executive Summary

SUBBU is an AI companion designed for local-first execution. Rather than reinventing desktop automation, 3D character animation, speech processing, and agent orchestration from scratch, SUBBU inspects and leverages the state-of-the-art across 24 leading open-source repositories.

This document presents a comprehensive technical breakdown of each studied repository, examining its internal structure, core algorithms, performance characteristics, licensing, and specific application within SUBBU.

---

## 1. Desktop & Computer Use Subsystem

### 1.1 Vercel Agent Desktop (`vercel-labs/agent-desktop`)
- **Language / Runtime:** Rust (edition 2021), Win32 / UIA COM APIs.
- **Core Architecture:**
  - Implements direct operating system accessibility inspection via `IUIAutomation` COM interfaces rather than relying on computer vision / screenshot OCR.
  - Generates token-efficient accessibility trees using `--skeleton`, `--interactive-only`, and `--compact` flags.
  - Ephemeral element token generator (`crates/core/src/refs/`) scopes element IDs (`@ref`, e.g. `@s7k2p9:e12`) to a snapshot timestamp to prevent stale mutations.
  - Clear separation between headless semantic mutations (`ValuePattern`, `InvokePattern`) and headed physical interactions (`SendInput`).
  - Added native MCP stdio protocol support in v1.2.0 (`src/mcp/catalog.rs`) reflecting CLI commands as MCP tools.
- **Role in SUBBU:** Core desktop automation engine. Wrapped with SUBBU's C# station launcher (`agent-desktop-launcher.exe`) to bind to `WinSta0\Default` and ensure flawless execution from background subshells.

### 1.2 OpenClaw Windows Node (`openclaw/openclaw-windows-node`)
- **Language / Runtime:** Node.js / C# / PowerShell.
- **Core Architecture:**
  - Provides native Windows platform integration for OpenClaw Gateway.
  - Manages process lifecycle, window focus events, clipboard inspection, and host telemetry.
  - Exposes approval resolution endpoints (`exec.approval.resolve`) for interactive confirmation gates.
- **Role in SUBBU:** Complements Agent Desktop by providing elevated process lifecycle awareness, execution approval dialog routing, and host health telemetry.

---

## 2. 3D Companion, VRM & Character Animation Subsystem

### 2.1 moeru-ai / airi (`moeru-ai/airi`)
- **Language / Runtime:** TypeScript, Vue / React, Three.js, Web Audio.
- **Core Architecture:**
  - Designed specifically as an expressive AI companion interface rather than a generic chatbot.
  - Introduces a companion-first layout: 3D character occupies the visual focus, while chat and controls float in unobtrusive glass/acrylic panels.
  - Features an auto-narrowing composer that collapses during voice interaction to minimize visual obstruction.
  - Employs a 3-mode microphone controller: Push-to-Talk, Voice Activity Detection (VAD), and Continuous Streaming.
  - Implements TTS sanitization to strip emoji, Markdown formatting, and control tags before audio synthesis.
- **Role in SUBBU:** Direct inspiration for SUBBU's companion layout, floating HUD, 3-mode microphone pill, and TTS sanitization pipeline.

### 2.2 semperai / amica (`semperai/amica`)
- **Language / Runtime:** TypeScript, Next.js / React, Three.js, `@pixiv/three-vrm`, Tauri.
- **Core Architecture:**
  - Full-featured 3D character companion communicating with local Ollama instances.
  - Multi-layered emotion engine parsing emotion tags (`[happy]`, `[sad]`, `[curious]`) embedded in assistant responses.
  - Integrated speech recognition (Web Speech API / Whisper) and local TTS synthesis.
  - Rigorous VRM expression morphing with spring bone damping and camera orbit controls.
- **Role in SUBBU:** Architectural blueprint for connecting local Ollama Qwen models to VRM facial blendshapes and emotion states.

### 2.3 lobehub / lobe-vidol (`lobehub/lobe-vidol`)
- **Language / Runtime:** TypeScript, Next.js, Ant Design / Tailwind, React Three Fiber.
- **Core Architecture:**
  - Visual companion interface with "Video Call" immersion mode.
  - High-end glassmorphism design system using backdrop blur, border lighting, and floating action panels.
  - Expressive character stage with dynamic lighting (directional key light + ambient fill + rim lighting).
- **Role in SUBBU:** UI/UX benchmark for SUBBU's glass panels, backdrop blur styling, and immersive Stage Mode.

### 2.4 met4citizen / TalkingHead (`met4citizen/TalkingHead`)
- **Language / Runtime:** JavaScript, Three.js, Web Audio.
- **Core Architecture:**
  - High-precision talking head rendering with real-time lip-sync and speech synchronization.
  - Implements natural secondary motion: subtle eye drift, gentle breathing oscillations, micro-head tilts during pauses.
  - Handles real-time speech interruption (barge-in): immediately cancels audio playback and transitions mouth blendshapes back to neutral rest position.
- **Role in SUBBU:** Architectural model for audio interruption (barge-in), secondary natural motion, and seamless blendshape reset.

### 2.5 pixiv / ChatVRM (`pixiv/ChatVRM`)
- **Language / Runtime:** TypeScript, Next.js, Three.js, `@pixiv/three-vrm`.
- **Core Architecture:**
  - The seminal open-source reference for web-based VRM character interaction.
  - `AutoBlink`: Decoupled eye blink controller operating on an independent randomized interval (2.0s – 5.5s) without interfering with facial emotions.
  - `VRMLookAtSmoother`: Smooth spherical interpolation for eye gaze targeting the camera or conversational focus points.
  - `expressionController`: Linear interpolation of blendshape weights preventing sudden jarring facial snaps.
- **Role in SUBBU:** Direct architectural adoption of decoupled `AutoBlink`, smooth eye gaze interpolation, and blendshape transition damping.

### 2.6 pixiv / three-vrm (`pixiv/three-vrm`)
- **Language / Runtime:** TypeScript, Three.js plugin.
- **Core Architecture:**
  - The official industry-standard VRM runtime for Three.js.
  - Implements humanoid bone retargeting, blendshape morph targets, spring bones (hair and clothing physics), and look-at constraints.
  - Full support for both VRM 0.0 and modern VRM 1.0 specifications.
- **Role in SUBBU:** Core rendering engine for SUBBU's 3D companion in `SubbuVrmCharacter.tsx`.

### 2.7 vrm-c / vrm-specification (`vrm-c/vrm-specification`)
- **Language / Runtime:** Specification, JSON Schemas, GLTF 2.0 extensions.
- **Core Architecture:**
  - Defines the binary structure of VRM files (GLTF 2.0 + `VRMC_vrm` extension).
  - Specifies standard humanoid bone naming conventions (`hips`, `spine`, `chest`, `neck`, `head`, `leftUpperArm`, etc.).
  - Defines preset expressions: `happy`, `angry`, `sad`, `relaxed`, `surprised`, `aa`, `ih`, `ou`, `ee`, `oh`, `blink`, `blinkLeft`, `blinkRight`.
  - Establishes licensing metadata embedded directly in avatars (commercial use permission, violent/sexual use restrictions, author attribution).
- **Role in SUBBU:** Foundational reference for expression mapping, blendshape compliance, and avatar license auditing.

### 2.8 madjin / vrm-samples (`madjin/vrm-samples`)
- **Language / Runtime:** 3D model repository (.vrm, CC0 / CC-BY).
- **Core Architecture:**
  - Curated collection of benchmark VRM avatars created by VRM Consortium members and 3D artists.
  - Contains CC0 public domain models (`Vita.vrm`, `Seed-san.vrm`) free from commercial or redistribution restrictions.
- **Role in SUBBU:** Source of verified, legally clean CC0 starter avatars loaded into `public/models/`.

### 2.9 mhndhayek / LyraAI (`mhndhayek/LyraAI`)
- **Language / Runtime:** TypeScript, React Three Fiber, Three.js.
- **Core Architecture:**
  - 3D companion platform with pre-baked animation clips and gesture triggers.
  - Demonstrates keyframe blending between idle breathing loops and conversational hand gestures.
- **Role in SUBBU:** Reference for gesture blending and companion state transitions.

### 2.10 wass08 / wawa-lipsync (`wass08/wawa-lipsync`)
- **Language / Runtime:** TypeScript, Web Audio API.
- **Core Architecture:**
  - Real-time client-side lip-sync using Web Audio API's `AnalyserNode` and FFT frequency analysis.
  - Divides audio spectrum into 7 frequency bands (50Hz–8000Hz) to capture formant energies (F1, F2, F3).
  - Classifies acoustic energy into 15 Oculus visemes and maps them directly to the 5 standard vowel blendshapes: `aa`, `ee`, `ih`, `oh`, `ou`.
  - Operates with zero cloud latency and zero CPU strain.
- **Role in SUBBU:** Adapted directly into SUBBU's `AudioVisemeAnalyzer` for instant, local audio-driven mouth animation during TTS playback.

### 2.11 wass08 / r3f-virtual-girlfriend-frontend & r3f-vrm-final
- **Language / Runtime:** React, React Three Fiber, Three.js, `@react-three/drei`.
- **Core Architecture:**
  - Demonstrates declarative Three.js component hierarchy within React.
  - Implements responsive camera framing, dynamic shadow projection, and smooth canvas resizing.
- **Role in SUBBU:** Design patterns for `SubbuStageCanvas.tsx`, lighting setups, and camera framing presets.

### 2.12 Open-LLM-VTuber (`Open-LLM-VTuber/Open-LLM-VTuber`)
- **Language / Runtime:** Python, TypeScript, WebSocket, VAD (Silero).
- **Core Architecture:**
  - Comprehensive voice-interactive VTuber pipeline.
  - Features real-time Voice Activity Detection (VAD) with barge-in interruption.
  - Enforces strict separation between private reasoning tokens (`<think>...</think>`) and public spoken responses.
- **Role in SUBBU:** Critical architecture for thought isolation (ensuring private chain-of-thought is never displayed in user speech or subtitles) and barge-in audio interruption.

### 2.13 LorisYounger / VPet (`LorisYounger/VPet`)
- **Language / Runtime:** C#, WPF.
- **Core Architecture:**
  - Highly popular desktop pet / companion application with rich state-machine transitions.
  - Divides animations into tripartite phases: Enter $\rightarrow$ Loop/Hold $\rightarrow$ Exit.
  - Introduces mood, intimacy, and context-dependent reactive behaviors.
- **Role in SUBBU:** Architectural model for the character state machine and smooth transition loops.

---

## 3. Assistant, Tools & Local LLM Orchestration Subsystem

### 3.1 leon-ai / leon (`leon-ai/leon`)
- **Language / Runtime:** TypeScript / Node.js, Python.
- **Core Architecture:**
  - Modular open-source personal assistant organized around "skills" and intent classification.
  - Separates Natural Language Understanding (NLU) from deterministic skill execution.
- **Role in SUBBU:** Reference for modular capability design and skill registry architecture.

### 3.2 Mintplex-Labs / anything-llm (`Mintplex-Labs/anything-llm`)
- **Language / Runtime:** JavaScript / Node.js, React.
- **Core Architecture:**
  - Full-stack local AI platform with document grounding (RAG), multi-provider model routing, and dynamic agent tool selection.
  - Implements deterministic tool invocation schemas and clean system prompt grounding.
- **Role in SUBBU:** Architectural guide for tool parameter validation and multi-model provider abstraction.

### 3.3 OpenInterpreter / open-interpreter (`OpenInterpreter/open-interpreter`)
- **Language / Runtime:** Python.
- **Core Architecture:**
  - Computer-use execution loop: Plan $\rightarrow$ Show Code $\rightarrow$ Request User Confirmation $\rightarrow$ Execute $\rightarrow$ Observe Result.
  - Enforces interactive approval boundaries before running high-risk commands.
- **Role in SUBBU:** Template for SUBBU's execution confirmation modal and Observe $\rightarrow$ Plan $\rightarrow$ Act $\rightarrow$ Verify flow.

### 3.4 szczyglis-dev / py-gpt (`szczyglis-dev/py-gpt`)
- **Language / Runtime:** Python, PyQt.
- **Core Architecture:**
  - Desktop AI assistant client integrating local Ollama models, voice I/O, and desktop execution logging.
- **Role in SUBBU:** Reference for desktop-first ergonomics and execution history auditing.

### 3.5 janhq / jan (`janhq/jan`)
- **Language / Runtime:** TypeScript, Electron, C++ (Nitro engine).
- **Core Architecture:**
  - Desktop local AI runtime prioritizing 100% offline privacy and hardware telemetry (VRAM, CPU, RAM).
- **Role in SUBBU:** Reference for VRAM telemetry tracking in `TopStatusCapsule.tsx` and settings configuration.

### 3.6 open-webui / open-webui (`open-webui/open-webui`)
- **Language / Runtime:** Python, Svelte / React, FastAPI.
- **Core Architecture:**
  - Leading chat interface for local LLMs, featuring markdown rendering, model parameter adjustments, and prompt engineering tools.
- **Role in SUBBU:** Reference for streaming chat message UI and markdown formatting.

### 3.7 DanielSWolf / rhubarb-lip-sync (`DanielSWolf/rhubarb-lip-sync`)
- **Language / Runtime:** C++ / CLI.
- **Core Architecture:**
  - Command-line tool generating acoustic phoneme-to-viseme timings from audio files.
- **Role in SUBBU:** Reference standard for viseme duration and transition heuristics; evaluated as an optional offline tool, while Web Audio FFT (`wawa-lipsync`) is used for live zero-latency speech.

### 3.8 openclaw / openclaw (`openclaw/openclaw`)
- **Language / Runtime:** TypeScript / Node.js, WebSocket Protocol v4.
- **Core Architecture:**
  - The foundation of SUBBU's orchestration runtime.
  - Manages session states, streaming deltas, tool registration, MCP server stdio bridges, and approval requests.
- **Role in SUBBU:** Primary backend orchestrator. SUBBU's frontend and desktop MCP server connect directly to the OpenClaw Gateway.

