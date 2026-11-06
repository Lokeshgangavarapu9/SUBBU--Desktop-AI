# SUBBU — 3D Character & Animation Architecture

**Author:** Principal Software Architect, Senior 3D Character Engineer  
**Date:** 5 November 2026  
**Host Target:** Three.js, `@pixiv/three-vrm`, React Three Fiber, Web Audio API  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  

---

## 1. Character System Design Principles

1. **Companion-First Visual Focus:** The 3D character is the heart of SUBBU, not a static portrait or decorative avatar. The character reacts in real time to speech, listening state, model reasoning, and desktop tool outcomes.
2. **Decoupled Animation Channels:** Facial expressions, eye blinking, eye gaze, breathing, and mouth visemes operate on independent sub-controllers so that one animation channel never inadvertently blocks another.
3. **Hardware Efficiency:** Optimized for 60 FPS on laptop GPUs (NVIDIA RTX 3050 Laptop, 4 GB VRAM) by minimizing draw calls, using smooth linear blendshape interpolation, and providing a reduced GPU mode.

---

## 2. Character Controller Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                  CharacterController                   │
                               │       (Central Orchestrator & Frame Update Loop)       │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
          ┌─────────────────────┬──────────────────────────┼──────────────────────────┬─────────────────────┐
          │                     │                          │                          │                     │
          ▼                     ▼                          ▼                          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐  ┌──────────────────┐
│ BlinkController  │  │ GazeController   │       │ EmoteController  │       │LipSyncController │  │GestureController │
│ (Random Interval,│  │ (Spherical Eye   │       │ (12 Blendshape   │       │(Web Audio Formant│  │ (Breathing Loop, │
│  Eyelid Reset)   │  │  Tracking, Sacc.)│       │  States, Damping)│       │ Analysis, Viseme)│  │ Procedural Arm)  │
└──────────────────┘  └──────────────────┘       └──────────────────┘       └──────────────────┘  └──────────────────┘
```

---

## 3. Sub-Controller Specifications

### 3.1 `BlinkController` (Adapted from `ChatVRM` & `TalkingHead`)
- **Isolation Principle:** Evaluated independently of the current facial expression. A smile or surprise blendshape does not freeze or conflict with eyelids.
- **Interval:** Natural randomized interval between 2.2 and 5.2 seconds.
- **Duration:** 80ms closing phase, 120ms opening phase.
- **Double-Blink Heuristic:** 15% probability of triggering a quick double-blink to mimic human biological saccades.
- **Blendshape Targets:** `blink`, `blinkLeft`, `blinkRight`.

### 3.2 `GazeController` (Adapted from `ChatVRM` `VRMLookAtSmoother`)
- **Saccadic Eye Movement:** Subbu's eyes softly track user focus points (such as mouse cursor or center of screen) with spherical interpolation (`slerp`) and subtle micro-saccades every 3–6 seconds.
- **Attentive Lock:** When the user is actively speaking (state: `listening`), eye gaze locks warmly to the center camera viewport.
- **Thinking Offset:** When processing (state: `thinking`), eye gaze drifts slightly up and to the right by 8–12 degrees to indicate cognitive retrieval.

### 3.3 `EmoteController` (Adapted from `Amica` & `VPet`)
- **Blendshape Smoothing:** Transitions between expressions use exponential decay / linear interpolation ($t = 0.15\text{s}$) to avoid robotic instant snaps.
- **12 Character States:**
  1. `idle`: Neutral, gentle breathing oscillation, soft relaxed brows.
  2. `listening`: Head tilted forward 3°, attentive gaze, ears/brows slightly raised.
  3. `thinking`: Head tilted 6° sideways, eyes drifted upward, brows thoughtful.
  4. `speaking`: Animated mouth visemes, contextual hand gestures, head nods on sentence emphasis.
  5. `happy`: Gentle smile, slightly narrowed eyes, subtle celebratory head bounce.
  6. `curious`: Head tilted sideways, one brow raised slightly.
  7. `surprised`: Eyes widened, brows raised, mouth slightly open.
  8. `concerned`: Brows slightly drawn inward, empathetic expression.
  9. `explaining`: Coordinated hand gesture, progressive nodding.
  10. `greeting`: Friendly wave motion, bright smile, direct eye contact.
  11. `task_success`: Delighted smile, nod of satisfaction, celebratory posture.
  12. `task_error`: Empathetic concerned look, gentle head shake.

### 3.4 `LipSyncController` (Adapted from `wawa-lipsync`)
- **Acoustic Formant Extraction:** The audio playback stream is routed through a Web Audio `AnalyserNode` (FFT size: 2048, sample rate: 44.1kHz / 48kHz).
- **Frequency Formant Bands:**
  - Band 1 (50Hz–200Hz): Fundamental energy / voiced speech.
  - Band 2 (200Hz–400Hz): First formant ($F_1$) lower vowel resonance (`ou`, `oh`).
  - Band 3 (400Hz–800Hz): First formant ($F_1$) open vowel resonance (`aa`).
  - Band 4 (800Hz–1500Hz): Second formant ($F_2$) mid vowel resonance (`ee`, `ih`).
  - Band 5 (1500Hz–2500Hz): Second / Third formant ($F_2/F_3$) high vowels.
  - Band 6 & 7 (2500Hz–8000Hz): Fricatives and sibilants (`s`, `sh`, `f`).
- **VRM Expression Mapping:**
  - `aa` $\rightarrow$ VRM `aa`
  - `ee` $\rightarrow$ VRM `ee`
  - `ih` $\rightarrow$ VRM `ih`
  - `oh` $\rightarrow$ VRM `oh`
  - `ou` $\rightarrow$ VRM `ou`
- **Dynamic Damping:** Smooth decay prevents mouth jitter between words, snapping to complete rest during speech pauses.

### 3.5 `GestureController` (Adapted from `LyraAI` & `TalkingHead`)
- **Procedural Breathing:** Sinusoidal chest and spine rotation ($f = 0.28\text{Hz}$, 16 breaths/min) applied to the `chest` and `spine` humanoid bones.
- **Head Nodding:** Micro-rotations on the `neck` bone at sentence boundaries to simulate natural cadence.
- **Barge-in Reset:** Immediate smooth dampening back to idle posture upon user interruption.

---

## 4. VRM Model Compatibility & Asset Governance

1. **Standard Humanoid Rigging:** Compatible with any standard VRM 0.0 or VRM 1.0 humanoid avatar exported from VRoid Studio, Blender, or Unity.
2. **Preset Expression Fallbacks:** If an avatar lacks specialized expressions, the controller gracefully falls back to the nearest baseline preset (`happy` $\rightarrow$ `relaxed`, `surprised` $\rightarrow$ `blink`).
3. **CC0 Starter Benchmark Avatars:** Shipped with verified public domain avatars (`Vita.vrm`, `Seed-san.vrm`, `AvatarSample_B.vrm`) for immediate zero-configuration operation.

