# SUBBU 2.0 — Standalone Windows Desktop Build Plan

**Document Version:** 1.0.0 (Phase 1 Engineering Roadmap)  
**Project Path:** `C:\Users\LOKESH\subbu 2.0`  
**Host Platform:** Windows 11 Home 64-bit  
**Target Output:** Standalone Windows 11 Desktop Application (`.msi` installer and portable `.exe`) via Tauri 2

---

## 1. Architectural Strategy & Recommendation

In evaluating the service orchestration model:
- **Option A (Tauri-Managed Services):** Tauri attempts to start, supervise, and terminate all local services (Ollama, OpenClaw, Agent Desktop).
- **Option B (Independent Local Services):** Ollama, OpenClaw, and Agent Desktop run externally; Tauri merely connects to loopback ports.

### Recommended Architecture: Hybrid Managed-Client Model
The **Hybrid Model** is strongly recommended for SUBBU 2.0 on Windows 11:
1. **Ollama as Standing Daemon:** Ollama runs as a background Windows service/tray app. This keeps the 26 layers of `qwen3.5:2b-q4_K_M` warm in RTX 3050 VRAM. Forcing Tauri to kill Ollama on window close would discard model weights, causing a 12-second cold reload delay on every app launch.
2. **OpenClaw Supervised Broker:** SUBBU checks `127.0.0.1:18789`. If active, it connects immediately. If offline, the frontend falls back directly to local Ollama streaming, and can trigger the managed process supervisor to start the gateway in the background.
3. **Agent Desktop as Windowless Sidecar:** `agent-desktop-launcher.exe` is bundled as an external binary sidecar invoked on-demand with `CREATE_NO_WINDOW = 0x08000000`.
4. **Production Frontend Direct Memory Stream:** In the packaged desktop app, Vite does not run at all. Tauri embeds `../dist` directly into the binary via WebView2 memory protocols, eliminating port 5173 and eliminating all web server overhead.

---

## 2. Phased Desktop Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASED DESKTOP IMPLEMENTATION ROADMAP                 │
├─────────────────┬───────────────────────────────────┬──────────────────┤
│ Phase           │ Primary Objective                 │ Status           │
├─────────────────┼───────────────────────────────────┼──────────────────┤
│ Phase 1         │ Architecture Audit & Readiness    │ COMPLETED        │
│ Phase 2         │ Host Toolchain Installation       │ PENDING APPROVAL │
│ Phase 3         │ Tauri Desktop Native Integration  │ PLANNED          │
│ Phase 4         │ Desktop Verification & Testing    │ PLANNED          │
│ Phase 5         │ Production Bundling & Packaging   │ PLANNED          │
└─────────────────┴───────────────────────────────────┴──────────────────┘
```

### Phase 1: Architecture Audit & Engineering Readiness (COMPLETED)
- Verified toolchain prerequisites (`node v26.13.0`, `npm 11.20.0`, `WebView2 156.0.4314.58`, `tauri-cli 2.12.4`).
- Identified missing toolchain components (Rust, Cargo, MSVC C++ Build Tools, Windows SDK).
- Documented complete architecture, CSP, service lifecycles, and security boundaries.

### Phase 2: Host Toolchain Setup (Awaiting User Authorization)
*Note: In accordance with Rule 4, no installations occur until explicitly approved by the user.*
1. Install **Visual Studio 2022 Build Tools** with the "Desktop development with C++" workload (`Microsoft.VisualStudio.Workload.VCTools`) and Windows 10/11 SDK.
2. Install **Rust** via `rustup-init.exe` targeting `stable-x86_64-pc-windows-msvc`.
3. Verify toolchain readiness:
   ```powershell
   rustc --version
   cargo --version
   npx tauri info
   ```

### Phase 3: Tauri Desktop Native Integration
1. Update `src-tauri/tauri.conf.json`:
   - Set explicit window label `"label": "main"`.
   - Register `agent-desktop-launcher.exe` under `bundle.externalBin`.
   - Configure system tray support (`app.tray`) for minimizing to the Windows notification area.
2. Integrate native plugins:
   - Add `@tauri-apps/plugin-global-shortcut` for system-wide `Alt+Space` / `Ctrl+K` invocation.
   - Add `@tauri-apps/plugin-opener` for native browser and calendar launching.
3. Test development desktop runtime:
   ```powershell
   npx tauri dev
   ```

### Phase 4: Desktop Functional Verification & Performance Testing
1. Test all 15 core workflows inside the native WebView2 window (Chat, Voice, Ollama streaming, OpenClaw WebSocket, Notepad, Calculator, Browser).
2. Measure desktop window launch time (Target: < 3 seconds warm launch).
3. Validate memory consumption (Target: < 150 MB for the Tauri desktop window).
4. Run 30-minute stability check inside the packaged container.

### Phase 5: Production Windows Packaging & Installer Generation
1. Execute production build:
   ```powershell
   npx tauri build
   ```
2. Verify generated build artifacts:
   - Standalone portable executable: `src-tauri/target/release/subbu-desktop.exe`
   - Windows Installer: `src-tauri/target/release/bundle/msi/SUBBU_1.0.0_x64_en-US.msi`
3. Perform test installation and verify Start Menu shortcut, desktop icon, and uninstaller.

---

## 3. Explicit User Approval Gates

The following actions require explicit user approval before execution:
1. **Installation of Visual Studio C++ Build Tools** (~1.5 GB download, ~4 GB disk space).
2. **Installation of Rust via `rustup`** (~200 MB disk space).
3. **Execution of `npx tauri dev`** (First-time compilation of Tauri Rust crates).
4. **Execution of `npx tauri build`** (Production installer compilation).

