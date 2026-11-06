# SUBBU CLI (Command-Line Interface) Guide

**Project:** SUBBU — Personal AI Desktop Companion  
**Platform:** Windows 11 Native Architecture  
**Binary Command:** `subbu`  
**Location:** `C:\Users\LOKESH\subbu 2.0\bin\subbu.cjs`  
**Global Shims:** `C:\Users\LOKESH\AppData\Roaming\npm\subbu.cmd`, `subbu.ps1`, `subbu`  

---

## 1. Overview

The **SUBBU CLI** (`subbu`) provides an official, zero-dependency, local-first terminal interface to inspect, control, automate, and orchestrate the SUBBU companion stack on Windows 11.

It connects directly with:
- **Local Ollama GPU Inference Engine** (`http://localhost:11434`, `qwen3.5:2b-q4_K_M`)
- **OpenClaw Gateway Orchestrator** (`ws://127.0.0.1:18789`)
- **SUBBU Web / R3F Frontend** (`http://127.0.0.1:5173`)
- **Native Windows UI Automation & Agent Desktop Bridge** (`WinSta0\Default`)

---

## 2. Global Installation & Registration

The CLI is registered in `C:\Users\LOKESH\AppData\Roaming\npm` (which is included in Windows `$env:PATH`). It can be invoked directly from **any PowerShell, Command Prompt, Windows Terminal, or Git Bash directory**.

```powershell
# Verify registration from any directory:
Get-Command subbu

# Test output:
# CommandType     Name        Source
# -----------     ----        ------
# ExternalScript  subbu.ps1   C:\Users\LOKESH\AppData\Roaming\npm\subbu.ps1
```

---

## 3. Supported Commands & Usage

### 3.1 `subbu help`
Displays the full command list, options, and usage examples.
```powershell
subbu help
```

### 3.2 `subbu status`
Inspects the live health, latencies, process IDs, and connection status of all 4 SUBBU sub-systems:
- Ollama local model engine (`qwen3.5:2b-q4_K_M` VRAM allocation)
- OpenClaw Gateway on port 18789
- SUBBU Frontend on port 5173
- Agent Desktop Station on `WinSta0\Default`
```powershell
subbu status
# Or output in machine-readable JSON:
subbu status --json
```

### 3.3 `subbu start`
Starts the SUBBU companion stack. Checks if Ollama and OpenClaw are active (spawning if needed), starts the Vite React frontend, and launches the default browser.
```powershell
# Foreground mode (interactive logs):
subbu start

# Background / daemon mode:
subbu start --daemon
```

### 3.4 `subbu stop`
Gracefully terminates active SUBBU frontend and background processes.
- **Safety Gate:** Prompts for confirmation (`[y/N]`) before terminating active processes.
- Pass `-y` or `--yes` to bypass the prompt for scripts.
```powershell
# Interactive (with prompt):
subbu stop

# Immediate:
subbu stop -y

# Stop all components including OpenClaw Gateway:
subbu stop -y --all
```

### 3.5 `subbu open browser`
Launches the default web browser (or Microsoft Edge) on the Windows 11 desktop and navigates to the SUBBU interface (`http://localhost:5173`).
```powershell
subbu open browser
```

### 3.6 `subbu open calendar`
Opens Google Calendar (`https://calendar.google.com`) in the user's browser.
- **Privacy & Authentication Boundary:** If unauthenticated, cleanly informs the user to complete one-time Google sign-in. Never fakes calendar events or credential data.
```powershell
subbu open calendar
```

### 3.7 `subbu open notepad`
Launches Notepad directly on the active Windows station (`WinSta0\Default`) using the native Agent Desktop bridge.
- Validates window creation and accessibility tree binding.
```powershell
subbu open notepad
```

### 3.8 `subbu open calculator`
Launches Windows Calculator using the verified `calc.exe` MSIX alias.
- Validates the active process and UIA interaction tree.
```powershell
subbu open calculator
```

### 3.9 `subbu timer <duration>`
Starts a real live interactive countdown timer in the terminal with an animated progress bar.
- Formats: `1m` (60s), `30s`, `2m`, `1m30s`, or raw seconds.
- Default duration is `1m`.
- Triggers terminal bell (`\x07`) and Windows system chime upon completion.
- Allows instant clean cancellation with `Ctrl+C`.
```powershell
subbu timer 1m
subbu timer 30s
subbu timer 2m
```

---

## 4. Verification & Testing

An automated test suite is included to verify all CLI operations:
```powershell
cd "C:\Users\LOKESH\subbu 2.0"
node test-subbu-cli.cjs
```

**Results:**
- `CLI Help Output`: ✅ PASS
- `CLI Version Flag`: ✅ PASS
- `CLI Status Command`: ✅ PASS
- `CLI Status JSON Output`: ✅ PASS
- `CLI Open Browser`: ✅ PASS
- `CLI Open Calendar`: ✅ PASS
- `CLI Open Notepad`: ✅ PASS
- `CLI Open Calculator`: ✅ PASS
- `CLI Timer Loop`: ✅ PASS

---

## 5. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `'subbu' is not recognized` | `PATH` cache not refreshed in current terminal | Open a new PowerShell tab or run `$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")` |
| `Ollama OFFLINE` | Ollama service is stopped | Run `ollama serve` or `subbu start` |
| `Gateway NOT DETECTED` | OpenClaw Gateway not started | Run `openclaw gateway run` |
| `Frontend server (port 5173) STOPPED` | Vite is offline | Run `subbu start` |
| `Confirmation skipped` | Scripting or CI execution | Supply `-y` or `--yes` to commands like `subbu stop` |

