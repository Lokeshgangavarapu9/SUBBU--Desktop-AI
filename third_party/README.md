# SUBBU — Third-Party Repositories Index & Research Directory

This directory contains external open-source repositories imported as capability sources and architectural references for **SUBBU — Your Personal AI Friend & Desktop Companion**.

---

## Repository Catalog

| Repository | Source URL | Upstream Maintainer | License | Primary Architectural Value to SUBBU |
| :--- | :--- | :--- | :--- | :--- |
| **agent-desktop** | `vercel-labs/agent-desktop` | Vercel Labs | Apache-2.0 | Native Windows accessibility tree (UIA COM), element references (`@ref`), semantic mutations, and headed input simulation. |
| **airi** | `moeru-ai/airi` | Moeru AI | MIT | Companion UI layout, 3-mode mic interaction, push-to-talk, auto-narrowing composer, and companion-first stage mode. |
| **amica** | `semperai/amica` | Semper AI | MIT | Three.js + VRM companion architecture, local Ollama integration, speech recognition/TTS, and emotion parsing pipeline. |
| **lobe-vidol** | `lobehub/lobe-vidol` | LobeHub | MIT | Acrylic/glass UI presentation, floating companion controls, and video conversation stage mode. |
| **TalkingHead** | `met4citizen/TalkingHead` | met4citizen | MIT | Audio-driven animation, viseme lip-sync, speech interruption handling, camera presets, and subtle secondary movement. |
| **ChatVRM** | `pixiv/ChatVRM` | Pixiv Inc. | MIT | Independent auto-blink (`AutoBlink`), smooth eye tracking (`VRMLookAtSmoother`), and emote transition controllers. |
| **three-vrm** | `pixiv/three-vrm` | Pixiv Inc. | MIT | Core Three.js VRM 0.0 and 1.0 humanoid runtime, blendshape expressions, and spring bone physics. |
| **vrm-specification**| `vrm-c/vrm-specification` | VRM Consortium | MIT / CC-BY | Technical specifications for VRM humanoid avatars, bone hierarchies, blendshape semantics, and licensing metadata. |
| **vrm-samples** | `madjin/vrm-samples` | Madjin | Multiple (CC0, CC-BY) | Benchmark sample models for testing humanoid rigging and expression compliance. |
| **LyraAI** | `mhndhayek/LyraAI` | MhnDhayek | MIT | VRM character animation clips, expression management, and companion state loops. |
| **wawa-lipsync** | `wass08/wawa-lipsync` | Wawa Sensei | MIT | Real-time Web Audio API FFT frequency band analysis to Oculus viseme mapping (`aa`, `ee`, `ih`, `oh`, `ou`). |
| **r3f-virtual-girlfriend** | `wass08/r3f-virtual-girlfriend-frontend` | Wawa Sensei | MIT | React Three Fiber companion scene layout, lighting, and camera orbit controls. |
| **r3f-vrm-final** | `wass08/r3f-vrm-final` | Wawa Sensei | MIT | R3F VRM controller patterns and Mixamo animation retargeting. |
| **Open-LLM-VTuber**| `Open-LLM-VTuber/Open-LLM-VTuber` | Open-LLM-VTuber | MIT | Voice activity detection (VAD), barge-in audio interruption, and internal thought separation (`<think>` suppression). |
| **VPet** | `LorisYounger/VPet` | LorisYounger | MIT | Desktop companion state machine, idle animation phases (enter, hold, exit), and companion personality cues. |
| **leon** | `leon-ai/leon` | Leon AI | MIT | Personal assistant intent routing, modular skills architecture, and local automation scheduling. |
| **anything-llm** | `Mintplex-Labs/anything-llm` | Mintplex Labs | MIT | Local LLM tool selection, document context grounding, and multi-provider abstraction. |
| **open-interpreter**| `OpenInterpreter/open-interpreter` | Open Interpreter | MIT | Desktop computer use execution loops, planning, and strict permission confirmation boundaries. |
| **py-gpt** | `szczyglis-dev/py-gpt` | szczyglis-dev | MIT | Desktop assistant UI workflows, local model selection, and tool execution logging. |
| **jan** | `janhq/jan` | Jan HQ | AGPL-3.0 (Ref only)| Local model management UX, local hardware acceleration monitoring, and provider abstractions. |
| **open-webui** | `open-webui/open-webui` | Open WebUI | MIT | Chat UX conventions, conversation history indexing, and parameter tuning interfaces. |
| **rhubarb-lip-sync**| `DanielSWolf/rhubarb-lip-sync` | Daniel S. Wolf | MIT | Offline acoustic phoneme-to-viseme extraction reference. |
| **openclaw** | `openclaw/openclaw` | OpenClaw | Apache-2.0 | Orchestration engine, gateway protocol v4, tool execution, session management, and approval gates. |
| **openclaw-windows-node** | `openclaw/openclaw-windows-node`| OpenClaw | Apache-2.0 | Native Windows desktop integration, process interaction, and OS capability bridges. |

---

## Isolation & Usage Principles

1. **Clean Separation:** Upstream repositories remain strictly isolated in `third_party/` with original licenses, notices, and attribution intact.
2. **No Monolithic Vendor Dumps:** SUBBU does not vendor entire unrelated applications into `src/`. Only verified, cleanly adapted modules (such as Web Audio viseme analysis and independent blink controllers) are integrated into SUBBU's codebase.
3. **SUBBU is the Product:** All technology serves SUBBU's unified personal companion experience: 3D character + Voice + Chat + Desktop Control + Tasks.

