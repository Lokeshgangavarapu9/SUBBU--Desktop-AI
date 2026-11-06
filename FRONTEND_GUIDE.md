# SUBBU — Personal AI Desktop Companion (Frontend Guide)

Welcome to **SUBBU**, a local-first Windows 11 AI desktop companion built with React 18, TypeScript, Vite, Tailwind CSS, React Three Fiber, Three.js, and OpenClaw Protocol v4.

---

## 1. Project Overview

SUBBU is an expressive, personal AI companion designed around a **character-centered spatial stage** rather than a generic dark-mode developer dashboard. She features:
- **Soft Pearl & Sakura Glass** visual identity with real-time blur and depth.
- **Modular 3D Companion Stage**: 60 FPS VRM humanoid rendering with 11 facial expressions, 10 hand/body gestures, natural auto-blinking, breathing, and cursor gaze tracking.
- **Ambient Pearl Aura Fallback**: A zero-WebGL 2D breathing canvas for low-GPU or character-disabled modes.
- **Real-Time Voice Architecture**: 3-mode microphone (Tap Dictation, Hold Walkie-Talkie, Toggle Continuous Call), Web Audio spectrum visualizer, and instant VAD barge-in interruption.
- **OpenClaw Protocol v4 Client**: Native typed WebSocket client connecting to `ws://127.0.0.1:18789` with challenge handshake, request correlation, auto-reconnection, and executive approval gates.
- **Ollama Integration**: Real-time VRAM telemetry (`GET /api/ps`) and model discovery (`GET /api/tags`) against `http://127.0.0.1:11434`.

---

## 2. Requirements

- **Operating System**: Windows 11 (or modern desktop OS).
- **Node.js**: Node.js `v22` / `v24` / `v26` and npm `10` / `11`.
- **Target Hardware Envelope**: Intel Core i5 / 16 GB RAM / NVIDIA RTX 3050 Laptop GPU (4 GB VRAM).
- **Local Services**:
  - OpenClaw Gateway running on `ws://127.0.0.1:18789`.
  - Ollama running on `http://127.0.0.1:11434`.

---

## 3. Installation

From the project root (`c:\Users\LOKESH\subbu 2.0`):

```powershell
# Install all required dependencies
npm install
```

---

## 4. Development

To launch the local development server with Hot Module Replacement (HMR):

```powershell
npm run dev
```

By default, Vite serves the application on:
`http://localhost:5173`

To build the production bundle:

```powershell
npm run build
```

---

## 5. Environment Variables

Create a `.env` or `.env.local` file in the root if you wish to override default service endpoints:

```env
VITE_OPENCLAW_WS_URL=ws://127.0.0.1:18789
VITE_OPENCLAW_HTTP_URL=http://127.0.0.1:18789
VITE_OLLAMA_HTTP_URL=http://127.0.0.1:11434
VITE_OPENCLAW_AUTH_TOKEN=
```

Endpoints can also be updated directly in the in-app **Settings & Diagnostics** drawer.

---

## 6. OpenClaw Connection

SUBBU communicates directly with OpenClaw Gateway via Protocol v4:
1. `connect.challenge` event received from Gateway on socket open.
2. `connect` request sent with `minProtocol: 4`, `role: "operator"`, and optional auth token.
3. `hello-ok` response verifies capabilities and establishes the authenticated session.
4. `sessions.send` streams incremental `chat` delta events.
5. `exec.approval.requested` events trigger the high-priority **Approval Modal** before any sensitive Windows desktop action executes.

---

## 7. Ollama Connection

- Models are retrieved from `http://127.0.0.1:11434/api/tags`.
- Real-time VRAM telemetry is polled from `http://127.0.0.1:11434/api/ps`, measuring loaded model footprint against your 4,096 MB VRAM budget.

---

## 8. Preview Simulation Mode

When running in cloud preview environments (such as Replit, Lovable, or codesandboxes) where the local loopback socket `127.0.0.1:18789` is blocked by browser Mixed Content or Local Network Access policies:
- The top status bar displays: `Local Gateway (127.0.0.1:18789) unreachable.` with an **Enable Preview Simulation** button.
- Preview Simulation Mode enables full UI/UX testing for streaming chat, emotion tags, thinking thought clouds, approval dialogs, and 3D character gestures without fabricating fake backend code.
- Running locally on Windows 11 defaults directly to **Real Mode**.

---

## 9. 3D Character Models

The character engine supports standard VRM 0.x and 1.0 humanoid models:
- Starter CC0 model pre-installed: `public/models/Vita.vrm` and `public/models/Seed-san.vrm`.
- To use custom VRoid Studio avatars:
  1. Export a `.vrm` character from VRoid Studio or Blender.
  2. Place it in `public/models/my_avatar.vrm`.
  3. In the Settings drawer under **Character**, set the path to `/models/my_avatar.vrm`.

---

## 10. Animation Pipeline

- **Breathing & Posture**: Harmonic bone offsets applied to `spine`, `chest`, and `head` inside `useFrame`.
- **Gaze Tracking**: Pointer tracking via `vrm.lookAt.target` smoothly damped with delta time.
- **11 Expressions**: `neutral`, `smiling`, `happy`, `excited`, `curious`, `thinking`, `confused`, `sad`, `surprised`, `sleepy`, `listening` with 0.65 co-articulation speech scaling.
- **10 Gestures**: `wave`, `greeting`, `happy`, `thinking`, `pointing`, `listening`, `celebrating`, `shy`, `goodbye`, `conversational`.
- **Lip-Sync**: Real-time Web Audio energy and formant analyzer lerping `aa`, `ih`, `ou`, `ee`, `oh` mouth blendshapes, closing smoothly on silence.

---

## 11. Voice Setup & Modes

The bottom floating composer features a **3-Mode Microphone Button**:
1. **Tap (Dictation Mode)**: Single click starts voice capture; automatically finishes on silence.
2. **Hold (Push-to-Talk / Walkie-Talkie)**: Press and hold to speak; releases to process immediately.
3. **Toggle (Continuous Hands-Free Call)**: Full conversational loop with real-time VAD barge-in interruption.

---

## 12. Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Status shows "Disconnected"** | OpenClaw Gateway not running on port 18789 | Run `openclaw gateway run` in Windows terminal. |
| **Status shows "Auth Required"** | Gateway has token authentication enabled | Enter your gateway token in the Settings drawer. |
| **Ollama models list is empty** | Ollama is offline | Run `ollama serve` or check `http://127.0.0.1:11434`. |
| **3D Canvas is black / blank** | WebGL context error or low VRAM | Toggle "Enable 3D Character" off to use Ambient Pearl Aura mode. |

---

## 13. Windows Desktop Packaging (Tauri v2)

The desktop configuration is prepared in `src-tauri/tauri.conf.json`:
- Utilizes Windows 11 native WebView2.
- Configured CSP permits loopback communication with ports 18789 and 11434.
- To compile the native `.exe` / `.msi`:
  ```powershell
  npm run build
  npx @tauri-apps/cli build
  ```

---

## 14. Performance Settings (RTX 3050 4GB VRAM)

- **Balanced Preset (Default)**: 1.25x DPR, 60 FPS, dynamic soft contact shadows.
- **Eco Preset**: 1.0x DPR, opaque pearl surfaces (zero backdrop blur cost), 30 FPS cap.
- **Auto-Pause on Minimize**: Enabled by default; WebGL loop pauses completely (`document.hidden === true`) when the window is minimized or behind full-screen games/IDEs, using 0% GPU.

---

## 15. License & Attribution

- **OpenClaw Protocol & Gateway**: MIT License (OpenClaw Project).
- **3D Starter Models**: `Vita.vrm` and `Seed-san.vrm` (CC0 1.0 Universal Public Domain).
- **Frontend Architecture**: Custom original implementation for SUBBU companion.

