# SUBBU 2.0 — Windows Build Toolchain Audit

**Audit Date:** 2026-11-05  
**Platform:** Windows 11 Home 64-bit (OS Build 26300)  
**Hardware:** Intel Core i5-13420H | 16 GB DDR5 RAM | NVIDIA GeForce RTX 3050 Laptop GPU  
**Audit Purpose:** Evaluate Windows host toolchain prerequisites for building standalone Tauri 2 desktop binaries.

---

## 1. Verified Toolchain Inventory

All checks were executed directly on the live Windows host via PowerShell.

| Toolchain Component | Version / Status | Empirical Verification Output | Classification |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v26.13.0` | `node --version` -> `v26.13.0` | **INSTALLED** |
| **npm Package Manager** | `11.20.0` | `npm --version` -> `11.20.0` | **INSTALLED** |
| **Microsoft Edge WebView2** | `156.0.4314.58` | Registry: `HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226...}\pv` | **INSTALLED** |
| **Tauri CLI (`@tauri-apps/cli`)**| `2.12.4` | `npx tauri --version` -> `tauri-cli 2.12.4` | **INSTALLED** |
| **Tauri Client API (`@tauri-apps/api`)**| `^2.0.0` | Verified in `package.json` dependencies | **INSTALLED** |
| **Rust Compiler (`rustc`)** | **MISSING** | `rustc : The term 'rustc' is not recognized` | **CRITICAL BLOCKER** |
| **Cargo Package Manager** | **MISSING** | `cargo : The term 'cargo' is not recognized` | **CRITICAL BLOCKER** |
| **MSVC C++ Compiler (`cl.exe`)** | **MISSING** | `cl.exe : The term 'cl.exe' is not recognized` | **CRITICAL BLOCKER** |
| **Visual Studio Build Tools** | **MISSING** | `vswhere.exe -latest -products *` -> Empty output | **CRITICAL BLOCKER** |
| **Windows 10/11 SDK** | **MISSING** | `C:\Program Files (x86)\Windows Kits\10\Include` -> Not found | **CRITICAL BLOCKER** |

---

## 2. Missing Dependencies Specification

Below is the detailed specification for every missing component required to compile native Windows binaries via Tauri 2.

### 2.1 Rust Toolchain (`rustc` & `cargo`)
- **Why it is needed:** Tauri's core runtime and Windows subsystem bindings are written in Rust. The Rust compiler compiles `src-tauri/src/main.rs` and links the Tauri runtime into a native Windows `.exe`.
- **Status:** **MANDATORY** for creating the standalone desktop executable.
- **Official Installation Method:** Official Rust installer script for Windows (`rustup-init.exe`):  
  [https://rustup.rs/](https://rustup.rs/) (or via winget: `winget install --id Rustlang.Rustup`).
- **Target Toolchain:** `stable-x86_64-pc-windows-msvc`.
- **System Restart:** No system reboot required; restart of the active terminal session is required to refresh `$env:PATH`.

### 2.2 Visual Studio 2022 C++ Build Tools
- **Why it is needed:** The Microsoft C++ toolchain (MSVC Linker `link.exe`, C++ runtime libraries) is required by the Rust `msvc` target to link native Windows API libraries (kernel32, user32, shell32, advapi32) into the final binary.
- **Status:** **MANDATORY** for compiling Rust crates on Windows.
- **Official Installation Link:**  
  [https://aka.ms/vs/17/release/vs_BuildTools.exe](https://aka.ms/vs/17/release/vs_BuildTools.exe)  
  *(Workload required: "Desktop development with C++" / `Microsoft.VisualStudio.Workload.VCTools`).*
- **System Restart:** May require a system restart depending on whether updated C++ redistributable runtimes are locked by existing Windows processes.

### 2.3 Windows 10/11 SDK (version 10.0.19041.0 or higher)
- **Why it is needed:** Contains the header files and import libraries for Windows API calls, UIA accessibility tree integration, and window framing.
- **Status:** **MANDATORY** (included as an optional component within the Visual Studio Build Tools installer).
- **Official Installation Link:** Included automatically when selecting the C++ Desktop workload in the Visual Studio installer, or standalone from Microsoft:  
  [https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/](https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/)
- **System Restart:** Typically not required.

---

## 3. Toolchain Status Summary for Phase 1

- **Web Development Toolchain:** 100% Complete (`Node v26.13.0`, `npm 11.20.0`, `Vite 6`, `TypeScript 5.7`).
- **Desktop Runtime Environment:** 100% Complete (`Microsoft Edge WebView2 156.0.4314.58`).
- **Native Binary Compiler Toolchain:** 0% Complete (Rust, Cargo, MSVC, and Windows SDK missing).

In strict compliance with **Phase 1 Rule 4 ("Do not install, uninstall, or upgrade dependencies")**, zero installations have been performed. These requirements are documented as pending user authorization for Phase 2.

