# SUBBU 2.0 — Tauri 2 Configuration Audit

**Audit Date:** 2026-11-05  
**Platform:** Windows 11 Home 64-bit  
**Evaluated Directory:** `src-tauri/`  
**Tauri Specification:** Tauri v2.x (`@tauri-apps/cli: 2.12.4`, `tauri crate: 2`)  
**Audit Status:** **Partially Configured — Build Blocked by Host Rust Toolchain**

---

## 1. Executive Summary

A comprehensive inspection of the `src-tauri/` directory was conducted to evaluate readiness for desktop bundling.

**Configuration Classification:** **PARTIALLY CONFIGURED**
- The high-level manifest (`tauri.conf.json`), Cargo package (`Cargo.toml`), capabilities definition (`capabilities/default.json`), and Windows icon assets (`icons/`) are properly structured for Tauri 2.
- However, the project is **not yet buildable** because the Rust compiler (`rustc`/`cargo`) and Visual Studio C++ Build Tools are not installed on the Windows host machine.

---

## 2. Detailed Configuration Item Breakdown

### 2.1 Project Metadata & Build Settings (`src-tauri/tauri.conf.json`)

| Field | Configured Value | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **`$schema`** | `https://raw.githubusercontent.com/tauri-apps/tauri/dev/tooling/cli/schema.json` | **VERIFIED** | Official Tauri 2 schema reference. |
| **`productName`** | `SUBBU` | **VERIFIED** | Product brand name. |
| **`version`** | `1.0.0` | **VERIFIED** | Matches root `package.json` version. |
| **`identifier`** | `com.subbu.desktop` | **VERIFIED** | Reverse-DNS bundle identifier. |
| **`beforeDevCommand`** | `npm run dev` | **VERIFIED** | Triggers local Vite development server. |
| **`devUrl`** | `http://localhost:5173` | **VERIFIED** | Matches Vite default listening port. |
| **`beforeBuildCommand`** | `npm run build` | **VERIFIED** | Executes `tsc -b && vite build`. |
| **`frontendDist`** | `../dist` | **VERIFIED** | Points to production build output directory. |

### 2.2 Window Framing & Display Settings

| Setting | Configured Value | Assessment |
| :--- | :--- | :--- |
| **Title** | `SUBBU — Your Personal AI Friend` | Clean user-facing title. |
| **Dimensions** | Width: `1440px`, Height: `900px` | Optimal for 1080p and 1440p displays. |
| **Minimum Bounds** | Width: `1024px`, Height: `680px` | Prevents HUD clipping on smaller screens. |
| **Window State** | Resizable: `true`, Fullscreen: `false` | Standard desktop behavior. |
| **Window Decorations** | `decorations: true` | Retains native Windows 11 title bar and controls. |
| **Transparency** | `transparent: false` | Uses native opaque framing for maximum rendering performance. |

### 2.3 Security Policy (CSP)

Configured CSP in `tauri.conf.json`:
```
default-src 'self'; 
connect-src 'self' ws://127.0.0.1:18789 http://127.0.0.1:18789 http://127.0.0.1:11434 ws://localhost:* http://localhost:*; 
img-src 'self' data: blob:; 
media-src 'self' blob: data:; 
font-src 'self' https://fonts.gstatic.com; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
script-src 'self' 'unsafe-inline'
```
- **Loopback Allowance:** Explicitly allows WebSocket and HTTP communication with `127.0.0.1:18789` (OpenClaw) and `127.0.0.1:11434` (Ollama).
- **Blob & Media:** Allows `blob:` and `data:` schemes required for audio playback and dynamic canvas rendering.

### 2.4 Desktop Icon Assets (`src-tauri/icons/`)

All mandatory desktop icon formats are present on disk:
- `32x32.png` (697 bytes) — Taskbar icon.
- `128x128.png` (2,338 bytes) — Small window icon.
- `128x128@2x.png` (5,747 bytes) — High-DPI icon.
- `icon.ico` (5,747 bytes) — Standard Windows executable icon.
- `icon.icns` (5,747 bytes) — macOS bundle icon.

### 2.5 Capabilities & Permissions (`src-tauri/capabilities/default.json`)

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for Subbu frontend desktop client",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-close"
  ]
}
```
- **Permission Boundary:** Configured for window lifecycle manipulation (`allow-start-dragging`, `allow-minimize`, `allow-maximize`, `allow-close`).
- **Capability Label Audit:** In `tauri.conf.json`, windows are declared without an explicit `"label": "main"`. In Tauri 2, while the first window defaults to `"main"`, explicitly declaring `"label": "main"` inside `tauri.conf.json` is recommended to prevent capability matching warnings during compilation.

### 2.6 Rust Project & Cargo Manifest (`src-tauri/Cargo.toml` and `src/main.rs`)

```toml
[package]
name = "subbu-desktop"
version = "1.0.0"
description = "SUBBU — Personal AI Friend"
authors = ["Lokesh"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Subbu desktop application");
}
```
- **Subsystem Attribute:** `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` is properly declared. This prevents a secondary command prompt window from appearing when the packaged application executable is launched on Windows.

---

## 3. Discovered Configuration Gaps

1. **Window Label Omission:** `src-tauri/tauri.conf.json` defines window configuration without `"label": "main"`. While functional, adding the explicit label aligns with `capabilities/default.json`.
2. **Missing System Tray Declaration:** If system tray minimization is desired in the final standalone release, `tauri-plugin-positioner` or Tauri 2 native tray configuration (`app.tray`) must be declared in `tauri.conf.json`.
3. **Rust Build Toolchain Absence:** The configuration files cannot be compiled into native machine code until Rust is installed on the host.

---

## 4. Conclusion

The Tauri 2 configuration files are sound, adhere to Tauri v2.x conventions, and correctly bind the production frontend assets and loopback security policies. No structural rewrites are necessary.

