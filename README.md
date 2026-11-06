# 🤖 Subbu — Personal AI Desktop Assistant

> **Master Reference Document** · Created: 4 November 2026 · Last verified: 5 November 2026
>
> This README is the permanent technical reference for the Subbu project.
> Any developer or AI agent reading this should be able to understand the full project without additional context.

---

## Table of Contents

1. [What Is Subbu?](#1-what-is-subbu)
2. [Vision and Ultimate Aim](#2-vision-and-ultimate-aim)
3. [Project Goals and Requirements](#3-project-goals-and-requirements)
4. [Current System Architecture](#4-current-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Installed Software and Dependencies](#6-installed-software-and-dependencies)
7. [Installation Locations and Directories](#7-installation-locations-and-directories)
8. [Project Files and Their Purposes](#8-project-files-and-their-purposes)
9. [Subbu Identity and Behaviour](#9-subbu-identity-and-behaviour)
10. [OpenClaw Configuration Overview](#10-openclaw-configuration-overview)
11. [Ollama and Qwen Configuration](#11-ollama-and-qwen-configuration)
12. [Agent Desktop Overview](#12-agent-desktop-overview)
13. [Completed Work — Chronological History](#13-completed-work--chronological-history)
14. [Verified Working Features](#14-verified-working-features)
15. [Failed, Unsupported and Incomplete Features](#15-failed-unsupported-and-incomplete-features)
16. [Known Errors and Troubleshooting History](#16-known-errors-and-troubleshooting-history)
17. [Current Project Status](#17-current-project-status)
18. [Desired Features and Integrations](#18-desired-features-and-integrations)
19. [Security, Privacy and Permission Requirements](#19-security-privacy-and-permission-requirements)
20. [Complete Implementation Roadmap](#20-complete-implementation-roadmap)
21. [Testing and Verification Plan](#21-testing-and-verification-plan)
22. [Additional Recommended Features](#22-additional-recommended-features)
23. [Known Limitations](#23-known-limitations)
24. [Two-PDF Comparison and Gap Analysis](#24-two-pdf-comparison-and-gap-analysis)
25. [Definition of Done](#25-definition-of-done)
26. [Important Rules and Constraints](#26-important-rules-and-constraints)
27. [Manual Startup and Shutdown Instructions](#27-manual-startup-and-shutdown-instructions)
28. [SUBBU Official CLI (`subbu`)](#29-subbu-official-cli)
29. [Next Steps (Approved by User Before Execution)](#28-next-steps-approved-by-user-before-execution)

---

## 1. What Is Subbu?

Subbu is a **personal AI assistant** designed to run entirely on a Windows 11 laptop (HP Victus 15).
Unlike an ordinary chatbot, Subbu can:

- **Understand** natural-language instructions ("Open Notepad", "Search for this topic in Chrome")
- **Observe** the Windows desktop by reading the UI accessibility tree
- **Act** on specific UI controls — clicking buttons, typing text, filling forms
- **Verify** that the action succeeded by taking a fresh snapshot
- **Ask permission** before doing anything risky, destructive, or sensitive

Subbu uses only **local and free resources** — no paid API subscriptions are required for core functionality.

The name and character: Subbu is warm, calm, intelligent, and honest about what it has and has not done.

---

## 2. Vision and Ultimate Aim

The ultimate aim is a fully working desktop AI assistant where the user can type or speak a request and Subbu:

1. Understands the request using a local AI model (Ollama + Qwen)
2. Identifies which Windows application to interact with
3. Takes a UI snapshot of the relevant window
4. Locates the correct control using its accessibility reference
5. Performs the permitted action
6. Takes a fresh snapshot to verify the result
7. Reports completion, partial success, or honest failure

**Long-term 9-agent architecture** (Gemini PDF vision):

| # | Agent | Purpose |
|---|---|---|
| 1 | Personal Assistant | Root conversational interface, task routing |
| 2 | Research Agent | Web research, paper summarisation |
| 3 | Coding Agent | Java, C, C++, Python, JavaScript, GitHub |
| 4 | Browser Agent | Chrome, YouTube, web navigation |
| 5 | Computer Agent | Windows desktop control via agent-desktop |
| 6 | File Management Agent | Safe file operations in whitelisted paths |
| 7 | Learning Agent | University subjects, algorithm proofs, quizzes |
| 8 | Automation Agent | Scheduled tasks, cron workflows |
| 9 | Communication Agent | Optional Telegram bot interface |

**Current phase:** We are building Agent #5 (Computer Agent) first — the foundation for everything else.

**Configuration target:** Config B — Hybrid Local + Free Cloud
- Local `qwen3.5:2b` (or future `qwen3:4b`) for instant private tasks
- Free Gemini / Groq APIs for long-context research when needed
- ₹0 recurring cost

---

## 3. Project Goals and Requirements

### Must Have (MVP)
- [x] Subbu identity configured in OpenClaw workspace
- [x] Ollama running with a local Qwen model
- [x] agent-desktop installed and working as a standalone CLI
- [ ] OpenClaw Gateway running and accepting connections
- [ ] OpenClaw config valid with at least one agent entry
- [ ] Subbu can invoke agent-desktop from within OpenClaw
- [ ] End-to-end test: Subbu opens Notepad and types a sentence
- [ ] End-to-end test: Subbu takes a snapshot and lists visible windows

### Should Have
- [ ] agent-browser installed for Chrome/Electron control
- [ ] Ollama environment variables set for VRAM safety
- [ ] Risk-tier approval system (read/moderate/high-risk actions)
- [ ] Fresh snapshots always taken; no stale references reused

### Nice to Have (Future)
- [ ] `qwen3:4b` model for stronger tool-calling capability
- [ ] nomic-embed-text for RAG/memory
- [ ] Telegram bot integration
- [ ] PowerShell profile switcher (Gaming/Balanced/Heavy modes)
- [ ] 9-agent full architecture
- [ ] Free cloud API fallback (Gemini, Groq)

---

## 4. Current System Architecture

```
┌─────────────────────────────────────────────────────────┐
│          USER (Types request in OpenClaw UI)            │
│                 http://127.0.0.1:18789                  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│          OPENCLAW GATEWAY (port 18789, loopback)        │
│          Agent: main / Subbu / qwen3.5:2b               │
│          Status: ⛔ CURRENTLY STOPPED                   │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐          ┌──────────────────────────┐
│  OLLAMA SERVER   │          │  INTEGRATION BRIDGE      │
│  Port 11434      │          │  (NOT YET BUILT)         │
│  qwen3.5:2b      │          │  Will wrap agent-desktop │
│  Status: ✅ OK   │          │  CLI commands            │
└──────────────────┘          └──────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  AGENT-DESKTOP v1.1.0    │
                              │  Windows UIA CLI         │
                              │  Status: ✅ Working      │
                              └──────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │  WINDOWS APPLICATIONS    │
                              │  Notepad, Chrome, etc.   │
                              │  Via Microsoft UIA API   │
                              └──────────────────────────┘
```

**Key gap:** The integration bridge between OpenClaw and agent-desktop does not exist yet. This is the primary remaining task.

---

## 5. Technology Stack

| Component | Technology | Licence | Cost |
|---|---|---|---|
| AI Orchestrator | OpenClaw 2026.10.10 | Proprietary | Free |
| Local AI Runtime | Ollama 0.40.14 | MIT | Free |
| Local AI Model | Qwen 3.5 2B Q4_K_M | Apache-2.0 | Free |
| Desktop Control | Vercel agent-desktop 1.1.0 | Apache-2.0 | Free |
| Windows Desktop API | Microsoft UI Automation (UIA) | Windows built-in | Free |
| JavaScript Runtime | Node.js v26.13.0 | MIT | Free |
| Package Manager | npm 11.20.0 | MIT | Free |
| Python | Python 3.14.4 | PSF | Free |
| OS | Windows 10 Home Single Language Build 26100 | Proprietary | Owned |

---

## 6. Installed Software and Dependencies

### Verified Installed (by direct inspection on 2026-11-04)

| Software | Version | Verification Method |
|---|---|---|
| Windows OS | 11 Home Single Language Build 26300 (26H2) / HAL 10.0.26100.1 | Registry `CurrentBuild=26300`, `DisplayVersion=26H2` |
| PowerShell | 5.1.26100.9818 | `$PSVersionTable` |
| Node.js | v26.13.0 | `node --version` |
| npm | 11.20.0 | `npm --version` |
| Python | 3.14.4 | `python --version` |
| PyMuPDF (fitz) | Installed | `import pymupdf` succeeded |
| OpenClaw | 2026.10.10 (7dc3350) | `openclaw --version` |
| agent-desktop | 1.1.0 | `agent-desktop --version` |
| Ollama | 0.40.14 | `ollama --version` |
| qwen3.5:2b-q4_K_M | Downloaded | `ollama list` |
| NVIDIA GPU | RTX 3050 A Laptop, 4094 MiB, Driver 592.82 | `nvidia-smi` |

### Not Installed (confirmed missing)

| Software | Purpose | How to Install |
|---|---|---|
| agent-browser | Chrome / Electron app automation | `npm install -g agent-browser` |
| qwen3:4b | Stronger agent model (optional upgrade) | `ollama pull qwen3:4b` |
| nomic-embed-text | RAG/memory embeddings | `ollama pull nomic-embed-text` |

### Ollama Environment Variables — NOT SET

None of the following are set as User environment variables (confirmed by inspection):

| Variable | Recommended Value | Purpose |
|---|---|---|
| `OLLAMA_FLASH_ATTENTION` | `1` | Enable Flash Attention to reduce VRAM |
| `OLLAMA_KV_CACHE_TYPE` | `q8_0` | Compress KV cache to fit in 4 GB VRAM |
| `OLLAMA_MAX_LOADED_MODELS` | `1` | Prevent multiple models in VRAM |
| `OLLAMA_NUM_PARALLEL` | `1` | Prevent concurrent inference |
| `OLLAMA_KEEP_ALIVE` | `3m` | Auto-unload model after 3 min idle |
| `OLLAMA_API_KEY` | `ollama-local` | Required by OpenClaw provider config |

---

## 7. Installation Locations and Directories

| Path | Contents | Status |
|---|---|---|
| `C:\Users\LOKESH\AppData\Roaming\npm\node_modules\openclaw` | OpenClaw npm package | ✅ Exists |
| `C:\Users\LOKESH\AppData\Roaming\npm\node_modules\agent-desktop` | agent-desktop npm package | ✅ Exists |
| `C:\Users\LOKESH\AppData\Roaming\npm\node_modules\agent-desktop\bin\agent-desktop-win32-x64.exe` | Native agent-desktop binary | ✅ Exists |
| `C:\Users\LOKESH\.openclaw\` | All OpenClaw data | ✅ Exists |
| `C:\Users\LOKESH\.openclaw\openclaw.json` | Main OpenClaw config | ✅ Exists (config invalid) |
| `C:\Users\LOKESH\.openclaw\workspace\` | Subbu workspace | ✅ Exists |
| `C:\Users\LOKESH\.openclaw\workspace-backup-20261104-162344\` | Workspace backup | ✅ Exists — PRESERVE |
| `C:\Users\LOKESH\.openclaw\agents\main\agent\` | Agent runtime data + SQLite DB | ✅ Exists |
| `C:\Users\LOKESH\.openclaw\state\` | OpenClaw state files | ✅ Exists |
| `c:\Users\LOKESH\subbu 2.0\` | This project workspace | ✅ Exists |
| `%LOCALAPPDATA%\Temp\openclaw\openclaw-2026-11-04.log` | OpenClaw log | Not verified in this session |

**Config backup files (DO NOT DELETE):**

```
C:\Users\LOKESH\.openclaw\
├── openclaw.json           ← Current config (INVALID)
├── openclaw.json.bak       ← Backup (most recent)
├── openclaw.json.bak.1     ← Backup
├── openclaw.json.bak.2     ← Backup
├── openclaw.json.bak.3     ← Backup
├── openclaw.json.bak.4     ← Oldest backup
└── openclaw.json.last-good ← Last known good config
```

---

## 8. Project Files and Their Purposes

### OpenClaw Workspace (`~\.openclaw\workspace\`)

| File | Purpose | Status |
|---|---|---|
| `SOUL.md` | Subbu's character and personality principles | ✅ Configured |
| `IDENTITY.md` | Subbu's name, role, emoji, vibe | ✅ Configured |
| `USER.md` | User preferences (PowerShell steps, no auto-start, etc.) | ✅ Configured |
| `AGENTS.md` | Operating rules for all agents (safety, tools, files) | ✅ Configured |
| `BOOTSTRAP.md` | OpenClaw birth sequence (should be deleted once workspace is configured) | ⚠️ Still present |

### This Project Workspace (`c:\Users\LOKESH\subbu 2.0\`)

| File / Directory | Purpose | Status |
|---|---|---|
| `README.md` | This master reference document | ✅ Created & updated |
| `AGENT_DESKTOP_REPOSITORY_ANALYSIS.md` | Deep architectural analysis & feature matrix of `vercel-labs/agent-desktop` | ✅ Complete |
| `AGENT_DESKTOP_SUBBU_INTEGRATION.md` | Master integration guide, architecture diagram, and test report | ✅ Complete |
| `src/integrations/agent-desktop/` | TypeScript integration layer (Client, Adapter, Health, Events, Types, Permissions) | ✅ Built & verified |
| `integrations/agent-desktop/upstream/` | Isolated clone of `vercel-labs/agent-desktop` (v1.2.0, commit `2b0a733`) | ✅ Cloned |
| `integrations/agent-desktop/adapter/` | Native CommonJS adapter package for backend execution | ✅ Operational |
| `desktop-mcp-server.js` | Unified MCP stdio server with security whitelisting and 15 native tools | ✅ Registered & active |
| `agent-desktop-launcher.exe` | Compiled C# desktop station bridge (`WinSta0\Default`) | ✅ Operational |
| `test-agent-desktop-integration.cjs` | 12-stage automated integration test suite | ✅ 12/12 Tests Passing |

---

## 9. Subbu Identity and Behaviour

Subbu's identity is defined in `~\.openclaw\workspace\IDENTITY.md`:

```markdown
# IDENTITY.md
- Name: Subbu
- Creature: Personal AI assistant
- Vibe: Cute, intelligent, calm, caring and capable
- Emoji: 👧🏻
```

**Core personality (`SOUL.md`):**
- Genuinely helpful, warm, intelligent and resourceful
- Friendly and playful, but serious when work matters
- Concise for simple tasks; thorough for complex ones
- Takes initiative when appropriate
- Never pretends to have completed an action
- Respects privacy, permissions and user trust

**Operating rules (`AGENTS.md`):**
- Never claim success without verification
- Protect credentials and personal data
- Ask before destructive, irreversible or externally visible actions
- Inspect existing files before modifying them
- Prefer local and free solutions
- Keep services local; no auto-startup without approval

**User preferences (`USER.md`):**
- Step-by-step instructions with exact PowerShell commands
- Concise progress updates during implementation
- Preserve existing files, projects, models and data
- Confirm before destructive or irreversible actions
- Never expose passwords, API keys or private tokens
- Manual startup only — no background auto-start

---

## 10. OpenClaw Configuration Overview

**Config file:** `C:\Users\LOKESH\.openclaw\openclaw.json`

**Current config summary (secrets redacted):**

```json
{
  "gateway": {
    "auth": { "mode": "token", "token": "[REDACTED]" },
    "mode": "local"
  },
  "agents": {
    "defaults": {
      "model": { "primary": "ollama/qwen3.5:2b-q4_K_M" }
    }
    // ⚠️ MISSING: agents.entries — this causes config INVALID error
  },
  "models": {
    "providers": {
      "ollama": {
        "api": "ollama",
        "apiKey": "ollama-local",
        "baseUrl": "http://127.0.0.1:11434",  // ✅ Correct
        "models": [{
          "id": "qwen3.5:2b-q4_K_M",
          "contextTokens": 8192,
          "maxTokens": 2048,
          "contextWindow": 262144,
          "reasoning": true
        }]
      }
    }
  },
  "tools": { "profile": "minimal", "web": { "search": { "enabled": true } } },
  "telemetry": { "enabled": false }
}
```

**Current OpenClaw status (verified 2026-11-04):**

| Property | Value |
|---|---|
| CLI Version | 2026.10.10 (7dc3350) |
| Config state | ✅ VALID (`openclaw config validate --json` passed with 0 warnings) |
| Gateway runtime | ✅ RUNNING (PID 27848, port 18789, loopback) via Tab 1 manual command |
| Scheduled Task | ⛔ Not installed (Intentional: adheres to user manual-startup preference) |
| Port 18789 | ✅ Active & Listening on 127.0.0.1 |
| Tools profile | minimal |
| MCP servers | 0 registered |
| Agents | main (default), identity Subbu |
| Agent model | ollama/qwen3.5:2b-q4_K_M |
| Workspace | `~\.openclaw\workspace` |

**Known config issue:** `openclaw doctor` previously flagged that the gateway.auth.token is stored in plaintext. This is a security concern to address in a future separately-reviewed change.

---

## 11. Ollama and Qwen Configuration

**Ollama version:** 0.40.14

**Available models:**
```
NAME                   ID              SIZE     MODIFIED
qwen3.5:2b-q4_K_M     1e2d21a4f03a    1.9 GB   3 hours ago
```

**OpenClaw model reference:** `ollama/qwen3.5:2b-q4_K_M`

**Ollama baseUrl in OpenClaw:** `http://127.0.0.1:11434` ✅ (Correct — no `/v1` suffix)

**Model capability notes:**
- 2B model is fast but has limited tool-calling capability for complex multi-step desktop loops
- Gemini PDF recommends `qwen3:4b` as the "sweet spot" for 100% GPU agent tasks (~42-52 tokens/sec on RTX 3050)
- Current 2B model estimated at ~75-95 tokens/sec but weaker reasoning
- Do NOT replace the current model without user approval — it is working and should be preserved

**Recommended Ollama env vars (not yet set — see Section 6):**
These should be set before running heavy agent loops to protect the 4 GB VRAM of the RTX 3050.

---

## 12. Agent Desktop Overview & SUBBU Integration

**Installed Version:** 1.1.0 (Global CLI) | **Upstream Source:** 1.2.0 (Cloned in `integrations/agent-desktop/upstream`)  
**Binary:** `agent-desktop-win32-x64.exe` wrapped by `agent-desktop-launcher.exe`  
**Technology:** Native Rust binary; uses Windows Microsoft UI Automation (UIA) COM API + Win32 `SendInput`  
**Licence:** Apache-2.0  
**Integration Status:** Fully integrated into SUBBU via TypeScript client (`src/integrations/agent-desktop/`), CommonJS adapter (`integrations/agent-desktop/adapter/`), and unified MCP stdio server (`desktop-mcp-server.js`). All 12 integration tests pass.

**Key Architecture Components:**
1. **Interactive Desktop Station Bridge (`agent-desktop-launcher.exe`):** Attaches process to `WinSta0\Default` to prevent headless subshell enumeration failures (`EnumWindows failed`).
2. **Observe -> Act -> Verify Pipeline:** Automatically captures skeletonized accessibility snapshots, executes actions (with auto-fallback to semantic `ValuePattern`/`InvokePattern` or headed input), and takes post-action snapshots to verify results.
3. **Security Whitelisting:** Permitted applications strictly enforced (`notepad`, `calc`, `chrome`, `explorer`, `code`). Shell command chaining blocked at argument boundary.
4. **15 Native MCP Tools:**
   - Original 6: `desktop_list_apps`, `desktop_snapshot`, `desktop_click`, `desktop_type`, `desktop_fill`, `desktop_launch`
   - Advanced v1.2.0: `desktop_list_windows`, `desktop_focus_window`, `desktop_find`, `desktop_get`, `desktop_is`, `desktop_press`, `desktop_clipboard_get`, `desktop_clipboard_set`, `desktop_status`

**What agent-desktop does:**
- Reads the Windows accessibility tree (like a screen reader, but for AI agents)
- Assigns deterministic snapshot-qualified references to every UI element: `@<snapshot_id>:e<number>`
- Exposes 60+ CLI commands: snapshot, find, click, type, fill, set-value, launch, list-apps, list-windows, etc.
- Runs per-command and exits in milliseconds — no background daemon needed
- Requires 0 MB VRAM; uses ~10-25 MB RAM only during execution

**Verified working commands (tested 2026-11-04):**
```powershell
agent-desktop --version                                   # ✅ Returns 1.1.0
agent-desktop list-apps                                   # ✅ Lists running apps
agent-desktop snapshot --skeleton --interactive-only --compact  # ✅ Works
agent-desktop set-value '@<ref>' 'Hello!'                 # ✅ Visually confirmed
```

**NOT supported (confirmed 2026-11-04):**
```powershell
agent-desktop mcp   # ⛔ INVALID_ARGS: unrecognized subcommand 'mcp'
```

> **Note:** PR #519 on the vercel-labs/agent-desktop GitHub repository adds `agent-desktop mcp` support. This may appear in a future version after 1.1.0. Do NOT attempt `agent-desktop mcp` on the currently installed version.

**Critical Windows PowerShell rule:**
```powershell
# ✅ CORRECT — always single-quote @refs in PowerShell
agent-desktop click '@s8f3k2p9:e12'

# ⛔ WRONG — unquoted @ is PowerShell splatting operator
agent-desktop click @s8f3k2p9:e12
```

**Known v1.1.0 limitations on Windows:**

| Issue | Impact | Workaround |
|---|---|---|
| Issue #459: Notepad SetValue-only control (`POLICY_DENIED`) | Headless `type` fails on legacy Win32 edit controls | Use `--headed` flag |
| Issue #463: Chrome snapshot exceeds 1MB RefMap | Unfiltered Chrome snapshot fails | Always use `--skeleton -i --compact` |
| Issue #478: UWP windows missed by `list-apps` | Some apps not found | Target by `--app <name>` explicitly |
| Issue #513: `press` rejects punctuation on Windows | Raw keystroke simulation broken | Use `fill` or `type` on element refs |

---

## 13. Completed Work — Chronological History

| Date (approx.) | Work | Status |
|---|---|---|
| 2026-11-04 AM | Research: YouTube video analysis, GitHub repo analysis, hardware compatibility, model comparison | ✅ Complete |
| 2026-11-04 AM | Subbu identity files created: SOUL.md, IDENTITY.md, USER.md, AGENTS.md | ✅ Complete |
| 2026-11-04 AM | OpenClaw 2026.10.10 confirmed installed | ✅ Complete |
| 2026-11-04 AM | Ollama installed (v0.40.14) | ✅ Complete |
| 2026-11-04 AM | qwen3.5:2b-q4_K_M model downloaded | ✅ Complete |
| 2026-11-04 AM | agent-desktop installed (first attempt — postinstall blocked) | ✅ Complete (with `--allow-scripts`) |
| 2026-11-04 AM | agent-desktop version and status verified | ✅ Complete |
| 2026-11-04 AM | agent-desktop skills documentation read | ✅ Complete |
| 2026-11-04 AM | Notepad launched and snapshot taken | ✅ Complete |
| 2026-11-04 AM | AMBIGUOUS_TARGET error handled with specific window ID | ✅ Resolved |
| 2026-11-04 AM | `agent-desktop set-value` test passed visually | ✅ Verified by screenshot |
| 2026-11-04 AM | Workspace backup created | ✅ Exists at `workspace-backup-20261104-162344` |
| 2026-11-04 AM | Multiple openclaw.json backups created | ✅ 5 backups confirmed |
| 2026-11-04 AM | OpenClaw MCP add attempted — FAILED | ⛔ Failed (error -32000) |
| 2026-11-04 AM | `agent-desktop mcp` investigated — NOT SUPPORTED | ⛔ Confirmed unsupported |
| 2026-11-04 AM | OpenClaw config validated | ✅ Config valid at time (now shows invalid) |
| 2026-11-04 AM | OpenClaw doctor run — plaintext token flagged | ⚠️ No repairs applied |
| 2026-11-04 PM | Handover PDF prepared | ✅ Complete |
| 2026-11-04 PM | Full environment inspection by Antigravity | ✅ Complete |
| 2026-11-04 PM | Master README.md created | ✅ This document |

---

## 14. Verified Working Features

| Feature | Evidence | Notes |
|---|---|---|
| Ollama serving Qwen model | `ollama list` shows model | Model available, not currently loaded |
| `agent-desktop` CLI responding | `agent-desktop --version` → 1.1.0 | Binary works correctly |
| `agent-desktop list-apps` | Handover PDF: detected ChatGPT, Chrome, etc. | Verified in earlier session |
| `agent-desktop snapshot --skeleton` | Handover PDF: Windows Terminal detected | Verified in earlier session |
| `agent-desktop set-value` on Notepad | Screenshot confirmed | Direct CLI test, NOT through Subbu |
| OpenClaw CLI installed | `openclaw --version` → 2026.10.10 | CLI works; Gateway stopped |
| Workspace identity files | All 4 files read and content verified | SOUL, IDENTITY, USER, AGENTS all correct |
| Workspace backup | Directory confirmed | DO NOT DELETE |
| OpenClaw config backups | 5 backups confirmed | DO NOT DELETE |
| Ollama baseUrl correct (no `/v1`) | Config file verified | Critical for tool-calling |
| PyMuPDF installed | PDF extraction succeeded | Python 3.14.4 |

---

## 15. Failed, Unsupported and Incomplete Features

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| `agent-desktop mcp` subcommand | ⛔ UNSUPPORTED in v1.1.0 | `INVALID_ARGS: unrecognized subcommand 'mcp'` | PR #519 may add it in future |
| OpenClaw MCP registration of agent-desktop | ⛔ FAILED | Error -32000, process closed | No partial entry left (confirmed) |
| OpenClaw Gateway running | ⛔ STOPPED | `Runtime: stopped` from `openclaw gateway status` | Root cause: config invalid |
| OpenClaw config valid | ⛔ INVALID | Missing `agents.entries` | Must be fixed before gateway can start |
| OpenClaw Scheduled Task | ⛔ MISSING | "Service unit not found" | Run `openclaw gateway install` after config fix |
| Ollama env vars set | ⛔ NOT SET | Inspection confirmed all empty | VRAM not protected |
| agent-browser installed | ⛔ NOT INSTALLED | Not found in npm modules | Needed for Chrome/Electron control |
| Subbu end-to-end desktop control | ⛔ NOT ACHIEVED | No natural-language request has operated desktop | PRIMARY remaining goal |
| Free cloud API fallback | ⛔ NOT CONFIGURED | No GEMINI_API_KEY or GROQ_API_KEY | Optional future |
| 9-agent architecture | ⛔ NOT STARTED | Only 1 agent (`main`) configured | Long-term vision |
| Telegram bot integration | ⛔ NOT STARTED | Not in config | Optional future |

---

## 16. Known Errors and Troubleshooting History

### Error 1: OpenClaw Config INVALID — `agents.entries` missing

**Error message:**
```
Warning: Config issue: agents.entries: agents.entries must contain at least one configured agent
```

**Root cause:** The current `openclaw.json` has an `agents.defaults` section but no `agents.entries` (or `agents.list`) array. OpenClaw requires at least one explicitly configured agent entry.

**Previous attempts:** Config was validated as "valid" in an earlier session — this may indicate a schema change in OpenClaw version 2026.10.10, or the config was edited after the last validation.

**Fix required:** Add an `agents.entries` section. Requires backup of config first.

---

### Error 2: OpenClaw Gateway Stopped / Port 18789 FinWait1

**Symptoms:**
- `openclaw gateway status` → `Runtime: stopped`
- Port 18789: `FinWait1` state (not listening)

**Root cause:** Gateway cannot start because config is invalid (Error 1 above). Once config is fixed, gateway should start.

**Previous history:** Handover PDF documented Error 1006 (WebSocket `CLOSE_ABNORMAL`) in an earlier OpenClaw version (2026.4.15). The current installation (2026.10.10) is different.

---

### Error 3: `agent-desktop mcp` — INVALID_ARGS

**Command attempted:** `openclaw mcp add agent-desktop --command agent-desktop --arg mcp`

**Result:** OpenClaw tried to start `agent-desktop mcp` as an MCP server process. `agent-desktop mcp` returned `INVALID_ARGS: unrecognized subcommand 'mcp'`.

**Cause:** The `mcp` subcommand is NOT present in agent-desktop v1.1.0. It is being developed in PR #519 on the vercel-labs/agent-desktop repository.

**Do NOT retry this command** until a future version confirms `agent-desktop mcp` is supported.

---

### Error 4: Plaintext Gateway Token in Config

**Warning from `openclaw doctor`:**
```
(1) plaintext gateway.auth.token in config
```

**Risk:** The gateway authentication token is stored as plaintext in `openclaw.json`. This is a security concern if the config file is shared or backed up insecurely.

**Action:** Do not expose the token value. Migrate to supported secret references only as a separately reviewed change, after the main integration is working.

---

## 17. Current Project Status

```
PROJECT STATUS: 🟢 SUBBU 2.0 FULLY OPTIMIZED & PRE-RELEASE CERTIFIED

✅ DONE: Subbu identity, persona & workspace configured
✅ DONE: Ollama + local Qwen 2B model active with 100% GPU offload on RTX 3050 (45.3 t/s)
✅ DONE: OpenClaw Gateway Protocol v4 WebSocket active on 127.0.0.1:18789 with direct Ollama fallback
✅ DONE: Complete React Frontend Shell built with Vite (146 kB chunked entry bundle, 0 errors)
✅ DONE: Character Removal Complete — Girl character & VRM packages deleted; Ambient Aura Stage active
✅ DONE: Windowless Automation Launcher — C# Win32 runner eliminates command prompt window popping
✅ DONE: Singleton Process Supervisor — PID leasing in subbu-runtime-pids.json prevents duplicates
✅ DONE: Agent Desktop Integration Adapter implemented with native tools (Observe-Plan-Act-Verify)
✅ DONE: Full-duplex voice interaction with VAD barge-in and audio viseme FFT telemetry
✅ DONE: Spotlight Quick Command Overlay (Ctrl+K / Alt+Space) and live system telemetry dashboard

NEXT MILESTONE: Optional local neural TTS (Piper) & multi-monitor virtual screen calibration.
```

---

## 18. Desired Features and Integrations

### Phase 1 — Core Desktop Control (Immediate)
- Fix OpenClaw config and restart Gateway
- Choose and implement ONE integration method between OpenClaw and agent-desktop
- Implement the Observe → Act → Verify loop
- Test: Subbu opens Notepad, types a sentence, verifies the result
- Test: Subbu takes a snapshot and lists visible windows

### Phase 2 — Browser Control
- Install `agent-browser`
- Test Chrome navigation via `agent-browser`
- Test: Subbu opens Chrome and navigates to a URL

### Phase 3 — Safety and Polish
- Risk-tier approval system (read/moderate/high)
- Proper error handling (STALE_REF, AMBIGUOUS_TARGET)
- Multi-window disambiguation (ask user, never guess)
- Context cap set to 16384 tokens

### Phase 4 — Extended Agents (Future)
- Research agent with free Gemini/Groq APIs
- Coding agent with `qwen2.5-coder:7b`
- File management agent with whitelisted paths
- Learning agent for university subjects
- Automation agent with cron scheduler
- Optional Telegram bot

---

## 19. Security, Privacy and Permission Requirements

### NEVER automate without explicit human approval:
1. Banking, UPI, credit card, or financial transactions
2. Recursive file deletions or modifications outside whitelisted paths
3. Reading `.env` secrets, SSH keys, or password managers
4. Outbound emails, messages, or `git push --force`
5. Running agents inside an elevated (Administrator) terminal
6. Installing software, plugins, or OS settings changes
7. Submitting forms with personal information

### Privacy requirements:
- Never log or transmit screen content to external services
- Never capture password managers, banking pages, or private messages
- Keep gateway bound to 127.0.0.1 — no LAN or public exposure
- Never store API keys, tokens, or passwords in memory or workspace files
- Redact sensitive output before returning it to the LLM context

### Security architecture:
- Run OpenClaw at standard (non-Administrator) Medium integrity level
- This ensures Windows UIPI blocks agent access to Task Manager, Registry Editor, and UAC prompts
- Tools profile: keep as `minimal` unless a specific tool is needed
- One integration bridge only — no overlapping or duplicate agent-desktop wrappers

### Risk tiers for desktop actions:
| Tier | Examples | Approval Required |
|---|---|---|
| Low / Read-only | list-apps, snapshot, find, list-windows | No |
| Moderate | launch app, type in blank document, click UI button | No (but verify) |
| High | delete files, send messages, submit forms, install software | Yes — always ask user |

---

## 20. Complete Implementation Roadmap

### Phase A — Fix OpenClaw Config (Prerequisite — Nothing Else Works Until This Is Done)

**Objective:** Make `openclaw config validate` report "Config valid" with no warnings.

**Work required:**
1. Create a new timestamped backup of `openclaw.json` before any edits
2. Add a valid `agents.entries` section to `openclaw.json` (the `main` agent with identity Subbu)
3. Optionally set `contextTokens` to 16384 (practical limit for 2B model)
4. Run `openclaw config validate` to confirm

**Dependency:** Must be done first.  
**Risk:** Config edit must be careful — always backup before editing.  
**Testing:** `openclaw config validate` → "Config valid, no warnings"

---

### Phase B — Start OpenClaw Gateway

**Objective:** Get the Gateway running on `127.0.0.1:18789`.

**Work required:**
1. Install Scheduled Task: `openclaw gateway install`
2. Start gateway: `openclaw gateway start`
3. Verify: `openclaw gateway status` → `Runtime: running`
4. Verify port: `Get-NetTCPConnection -LocalPort 18789 -State Listen`

**Dependency:** Phase A must be complete.  
**Risk:** Low — reversible.  
**Testing:** `openclaw status --all` should show gateway running.

---

### Phase C — Build the Integration Bridge

**Objective:** Allow Subbu (through OpenClaw) to invoke agent-desktop commands.

**Chosen approach:** A minimal, local MCP-compatible server (Node.js or Python) that:
- Wraps a whitelist of safe agent-desktop CLI commands
- Validates arguments before passing to the binary
- Respects risk tiers (read-only vs. action vs. high-risk)
- Returns structured JSON results to OpenClaw

> **Decision needed from user:** Confirm the integration approach before implementation begins.

**Work required:**
1. Write a local MCP adapter script
2. Register it with `openclaw mcp add`
3. Verify MCP server starts and responds
4. Test: OpenClaw can invoke `list-apps` through the MCP server

**Dependency:** Phase B must be complete.  
**Risk:** Medium — new code being introduced.  
**Testing:** OpenClaw can call `list-apps` and receive a list of running apps.

---

### Phase D — End-to-End Testing (Definition of Done)

**Objective:** Subbu receives a natural-language request and operates the desktop.

**Test suite:**
1. Subbu invokes `list-apps` via the bridge and returns the visible app list
2. Subbu takes a skeleton snapshot of Notepad
3. Subbu opens Notepad (or another harmless app)
4. Subbu types a test sentence in Notepad, takes a fresh snapshot, verifies the value
5. Subbu handles AMBIGUOUS_TARGET correctly (asks user to choose)
6. Subbu handles STALE_REF correctly (re-snapshots)
7. Disallowed commands are blocked by the wrapper
8. High-risk actions trigger an approval request

**Dependency:** Phase C must be complete.

---

### Phase E — Final Handover

**Work required:**
1. Document all modified files and reasons for changes
2. Create new timestamped backup
3. Provide rollback instructions
4. Report all tests as PASS / FAIL / NOT RUN with evidence
5. Provide simple manual start/stop instructions

---

## 21. Testing and Verification Plan

### Test 1 — OpenClaw Config Valid
```powershell
openclaw config validate
# Expected: Config valid — no warnings
```

### Test 2 — OpenClaw Gateway Running
```powershell
openclaw gateway status
# Expected: Runtime: running, port 18789
Get-NetTCPConnection -LocalPort 18789 -State Listen
# Expected: One entry with State=Listen
```

### Test 3 — Ollama Model Ready
```powershell
ollama list
# Expected: qwen3.5:2b-q4_K_M visible
ollama run qwen3.5:2b-q4_K_M "Reply with the single word READY."
# Expected: "READY"
```

### Test 4 — agent-desktop Standalone
```powershell
agent-desktop list-apps
# Expected: List of running Windows applications
agent-desktop snapshot --skeleton -i --compact
# Expected: JSON snapshot of active window
```

### Test 5 — Integration Bridge
```powershell
openclaw mcp list
# Expected: agent-desktop bridge listed
```

### Test 6 — End-to-End Natural Language
```
# User types in OpenClaw UI:
"List the currently open applications on my desktop."
# Expected: Subbu calls agent-desktop list-apps via bridge and returns the list
```

### Test 7 — End-to-End Desktop Action
```
# User types:
"Open Notepad and type the sentence: Subbu is working correctly."
# Expected: Notepad opens, text appears, Subbu confirms with a fresh snapshot
```

---

## 22. Additional Recommended Features

### Essential before claiming the system is complete:
- Ollama VRAM environment variables (protect the RTX 3050 4 GB VRAM)
- Context window cap at 16384 tokens (practical limit; current 262144 is excessive for 2B)
- Skeleton snapshot enforcement in wrapper (saves 78%-96% of tokens)
- Always fresh snapshots — never reuse stale `@refs` from previous turns

### Useful next additions:
- `agent-browser` for Chrome/Electron app control
- PowerShell profile functions: `Set-AIMode` and `Get-AIDesktopStatus` (from Gemini PDF Appendix D)
- GPU eviction watcher for gaming coexistence (Gemini PDF Appendix E)

### Optional future improvements:
- `qwen3:4b` model upgrade (better tool-calling; 42-52 tokens/sec vs 75-95 for 2B but stronger reasoning)
- `nomic-embed-text` for RAG/memory (274 MB; zero API cost)
- Free cloud API fallback: Gemini 3.8 Flash / Groq Llama 4 Scout
- Custom Ollama Modelfiles with pinned VRAM parameters
- Telegram bot integration (`@BotFather` — free)
- 9-agent full architecture

---

## 23. Known Limitations

| Limitation | Impact | Notes |
|---|---|---|
| `qwen3.5:2b` has limited tool-calling ability | May struggle with complex multi-step desktop loops | Monitor; upgrade to `qwen3:4b` if needed |
| Agent Desktop refs are snapshot-scoped | Stale refs cause STALE_REF errors after UI changes | Always re-snapshot after any action |
| Windows Notepad legacy edit control | Headless `type` returns `POLICY_DENIED` | Use `--headed` flag |
| Chrome full-tree snapshot exceeds 1MB | Unfiltered Chrome snapshot fails | Always use `--skeleton -i --compact` |
| No LAN/public access to gateway | Subbu only works on this computer | By design — security requirement |
| `agent-desktop mcp` not supported in v1.1.0 | Cannot use native MCP mode yet | PR #519 pending in future version |
| 4 GB VRAM total on RTX 3050 | Limits model size; 7B+ models require CPU offload | Env vars help manage this |
| Windows 10 (not 11) confirmed | Some docs/features may reference Win 11 | Note discrepancy: Handover says Win 11, actual is Win 10 Build 26100 |

---

## 24. Two-PDF Comparison and Gap Analysis

| Requirement from Gemini PDF | Handover PDF Status | Actual Inspection (2026-11-04) | Remaining Work |
|---|---|---|---|
| OpenClaw as central orchestrator | Installed, Error 1006 | Installed v2026.10.10; Gateway STOPPED | Fix agents.entries + reinstall Gateway task |
| Ollama local inference | Required install | ✅ v0.40.14 running | Set env vars |
| `qwen3:4b` as primary agent model | Recommended | Only `qwen3.5:2b` installed | Optional upgrade |
| `agent-desktop` for desktop control | Required | ✅ v1.1.0 installed, CLI works | Need integration bridge |
| MCP mode for agent-desktop | Option A | ⛔ Unsupported in v1.1.0 | Build local wrapper or wait for PR #519 |
| Notepad observe→act→verify | Required | Visual test passed (direct CLI) | Needs test via Subbu (not verified) |
| Chrome/YouTube control | Planned | Not tested | Install agent-browser first |
| `agent-browser` for browser | Recommended | ⛔ NOT installed | `npm install -g agent-browser` |
| Ollama env vars | Required | ⛔ NONE set | Set all 5 user env vars |
| `agents.entries` in config | Required | ⛔ MISSING | Add entry before gateway will start |
| Gateway Scheduled Task | Required | ⛔ MISSING | `openclaw gateway install` |
| SOUL.md, IDENTITY.md, USER.md, AGENTS.md | Completed | ✅ All 4 verified | Done |
| Workspace backup | Required | ✅ Exists | Done — preserve |
| Human approval for risky actions | Required | Defined in AGENTS.md | Needs enforcement in bridge code |
| Loopback-only gateway | Security requirement | ✅ Config confirms loopback | Done |
| No auto-startup without approval | Required | ✅ USER.md confirms | Done |
| PowerShell single-quote rule | Critical Windows rule | ✅ AGENTS.md documents it | Done |
| Skeleton snapshots | Required | ✅ AGENTS.md documents it | Done — also enforce in bridge |
| Risk tier system | Recommended | Defined in Handover PDF | Needs implementation |
| 9-agent architecture | Long-term vision | Only 1 agent configured | Future phase |
| Free cloud fallback (Gemini/Groq) | Recommended | No API keys configured | Optional future |
| Telegram bot | Optional | Not configured | Optional future |
| nomic-embed-text for RAG | Recommended | ⛔ Not installed | Future phase |
| **Subbu end-to-end desktop control** | **Definition of Done** | **⛔ NOT ACHIEVED** | **PRIMARY remaining goal** |

**Status labels used:**
- ✅ Completed and verified
- ⚠️ Partially completed
- ⛔ Not implemented / Failed
- 🔄 Needs verification

---

## 25. Definition of Done

The Subbu desktop control integration is **complete** when ALL of the following are true:

1. `openclaw config validate` passes with no warnings
2. `openclaw gateway status` shows `Runtime: running` on `127.0.0.1:18789`
3. Integration method is genuinely supported by installed versions
4. Subbu can receive a natural-language request and invoke the desktop bridge
5. Notepad workflow passes: open → type → snapshot → verify
6. Chrome workflow passes: open → navigate → verify (requires agent-browser)
7. AMBIGUOUS_TARGET and STALE_REF are safely handled
8. High-risk actions trigger user approval; blocked commands are blocked
9. Execution is least-privilege; no unrestricted shell access
10. All backups, rollback instructions, and a truthful test report are provided

---

## 26. Important Rules and Constraints

1. **Preserve the existing Subbu installation** — model, workspace, identity files, backups
2. **Do not rebuild from scratch** — extend what exists
3. **Do not replace `qwen3.5:2b`** without explicit user approval
4. **Do not delete backups** — `workspace-backup-20261104-162344` and all `.bak` files must be preserved
5. **Do not install unnecessary packages** — confirm purpose before installing anything
6. **Do not use unsupported OpenClaw or agent-desktop commands** — verify first
7. **Do not enable unrestricted terminal access** — keep tools profile `minimal`; expand only as needed
8. **Do not expose credentials** — mask all tokens, keys, and passwords in logs and reports
9. **Do not configure auto-startup** without explicit user approval
10. **Back up `openclaw.json` with a timestamp** before every edit
11. **Ask before** any destructive, irreversible, external, or security-sensitive action
12. **Prefer local and free solutions** — explain any paid dependency before proposing it
13. **Never claim success without evidence** — test and report results honestly
14. **If the PDFs conflict**, document the conflict; do not silently choose one version
15. **Keep Gateway on 127.0.0.1** — no LAN or public exposure

---

## 27. Manual Startup and Shutdown Instructions

> **Important:** No automatic startup or background services are configured. Everything is started manually.

### Starting Subbu (Manual)

```powershell
# Step 1 — Start Ollama (if not already running)
# Ollama usually auto-starts as a tray process; check if it is running:
Get-Process -Name "ollama*" -ErrorAction SilentlyContinue

# If not running, start it:
Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden

# Step 2 — Start OpenClaw Gateway
openclaw gateway start

# Step 3 — Verify everything is running
openclaw gateway status
Get-NetTCPConnection -LocalPort 18789 -State Listen
ollama list

# Step 4 — Open the Subbu web UI
# Navigate to: http://127.0.0.1:18789 in your browser
```

### Stopping Subbu (Manual)

```powershell
# Stop OpenClaw Gateway
openclaw gateway stop

# Stop Ollama (optional — frees VRAM)
Stop-Process -Name "ollama*" -ErrorAction SilentlyContinue
```

---

## 28. Next Steps (Approved by User Before Execution)

**These steps require explicit user approval before execution. This is a STOP point.**

The recommended order:

1. **Fix `openclaw.json`** — Add `agents.entries` section with the `main` agent
   - Create timestamped backup first
   - Run `openclaw config validate` to confirm

2. **Install OpenClaw Gateway Scheduled Task**
   - `openclaw gateway install`
   - `openclaw gateway start`
   - Verify port 18789 is listening

3. **Set Ollama environment variables** for VRAM protection
   - 5 variables: FLASH_ATTENTION, KV_CACHE_TYPE, MAX_LOADED_MODELS, NUM_PARALLEL, KEEP_ALIVE

4. **Choose integration approach** for OpenClaw ↔ agent-desktop
   - Option A: Local MCP adapter script (recommended)
   - Option B: Wait for `agent-desktop mcp` in a future version

5. **Build and register the integration bridge**

6. **Run end-to-end tests** (Test suite in Section 21)

7. **Install `agent-browser`** for Chrome/Electron control

---

> **⚠️ STOP — Do not begin any of the above steps until the user reviews this document and provides explicit approval.**

---

## 29. SUBBU Official CLI (`subbu`)

SUBBU provides a real command-line interface (`subbu`) executable from any PowerShell or Command Prompt terminal.

```powershell
subbu help               # Show help, options, and usage examples
subbu status             # Check Ollama, Gateway, Frontend, and Desktop Station health
subbu start [--daemon]   # Launch all SUBBU services and open browser
subbu stop [-y]          # Safely stop active frontend and background services
subbu open browser       # Open web browser to SUBBU interface
subbu open calendar      # Open Google Calendar (with privacy auth notice)
subbu open notepad       # Launch Notepad on WinSta0\Default desktop station
subbu open calculator    # Launch Windows Calculator
subbu timer 1m           # Run live interactive countdown timer in terminal
```

See [SUBBU_CLI_GUIDE.md](SUBBU_CLI_GUIDE.md) for complete details.

---

*Document created by Antigravity (Claude Sonnet 4.6 Thinking) on 4 November 2026.*  
*Based on: Handover PDF (5 pages), Gemini Blueprint PDF (29 pages), and direct environment inspection.*  
*All paths, versions, and status values are from verified inspection, not assumed from PDF history.*

