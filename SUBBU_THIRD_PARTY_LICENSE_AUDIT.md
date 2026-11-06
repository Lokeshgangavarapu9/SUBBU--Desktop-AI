# SUBBU — Third-Party License & Asset Audit

**Author:** Principal Software Architect, SUBBU Project  
**Date:** 5 November 2026  
**Project:** SUBBU — Your Personal AI Friend & Desktop Companion  
**Objective:** Complete legal and intellectual property audit for all imported open-source repositories and 3D assets.

---

## 1. Legal Audit Principles for SUBBU

1. **Source Code vs. Asset Separation:** A repository licensed under MIT or Apache-2.0 often contains 3D avatars, audio files, textures, or neural network weights that carry entirely different, proprietary, or non-commercial licenses. Source code licenses **do not** automatically apply to binary assets.
2. **Commercial Readiness:** SUBBU must not bundle CC-BY-NC (Non-Commercial) or proprietary restricted assets into its distribution.
3. **Copyleft Protection:** Strong copyleft licenses (GPL-3.0, AGPL-3.0) are inspected for architectural reference only. No copyleft source code may be linked or vendored into SUBBU to prevent license contagion.
4. **Attribution Compliance:** All permissive open-source modules (MIT, Apache-2.0, CC-BY) must retain their original copyright notices.

---

## 2. Comprehensive Repository License Audit

| Repository | Source License | Asset Licenses in Repo | Code Reusable? | Assets Reusable? | Commercial Use | Modification | Attribution Required | SUBBU Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`vercel-labs/agent-desktop`** | Apache-2.0 | None (CLI binary) | **Yes** | N/A | Permitted | Permitted | Yes (NOTICE file) | **DIRECT_REUSE / ADAPT:** Execute via `agent-desktop-launcher.exe`. Retain Apache-2.0 notice. |
| **`openclaw/openclaw`** | Apache-2.0 | None | **Yes** | N/A | Permitted | Permitted | Yes | **DIRECT_REUSE:** External gateway orchestration. |
| **`openclaw/openclaw-windows-node`** | Apache-2.0 | None | **Yes** | N/A | Permitted | Permitted | Yes | **ADAPT:** Clean implementation of approval resolution. |
| **`moeru-ai/airi`** | MIT | Sample avatars (various) | **Yes** | **Caution (Mixed)** | Permitted (Code) | Permitted (Code) | Yes | **ADAPT:** Reusable React/Vue UI patterns. Exclude third-party character assets. |
| **`semperai/amica`** | MIT | Mixed (sample VRM avatars) | **Yes** | **Caution (Mixed)** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE / ADAPT:** Adopt emotion parsing and Ollama client. Do not bundle avatars. |
| **`lobehub/lobe-vidol`** | MIT | Custom 3D assets | **Yes** | **No (Proprietary)** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE:** Adopt glassmorphism styling and video call stage concepts. |
| **`met4citizen/TalkingHead`** | MIT | Standard morph targets | **Yes** | Permitted | Permitted | Permitted | Yes | **ADAPT:** Adopt speech interruption and breathing oscillation formulas. |
| **`pixiv/ChatVRM`** | MIT | AvatarSample_A/B (CC0 / CC-BY) | **Yes** | **Verified CC0** | Permitted (Code & CC0) | Permitted | Yes | **ADAPT:** Extract `AutoBlink` and gaze smoothing. |
| **`pixiv/three-vrm`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **DIRECT_REUSE:** Core `@pixiv/three-vrm` npm package. |
| **`vrm-c/vrm-specification`**| MIT / CC-BY | Schemas and test models | **Yes** | Reference | Permitted | Permitted | Yes | **REFERENCE:** Format compliance and blendshape verification. |
| **`madjin/vrm-samples`** | CC0 / CC-BY | Explicitly audited VRMs | N/A | **Verified CC0 Only** | Permitted (CC0) | Permitted (CC0) | Yes (for CC-BY) | **ASSET_ONLY:** Use only verified CC0 avatars (`Vita.vrm`, `Seed-san.vrm`). |
| **`mhndhayek/LyraAI`** | MIT | Mixed unverified assets | **Yes** | **Unverified** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE ONLY:** Do not redistribute avatar meshes or animations. |
| **`wass08/wawa-lipsync`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **DIRECT_REUSE / ADAPT:** Adapted into `AudioVisemeAnalyzer`. |
| **`wass08/r3f-virtual-girlfriend`** | MIT | Non-commercial character | **Yes** | **REJECTED (Non-commercial)** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE:** Adopt camera framing math; reject non-commercial 3D model. |
| **`wass08/r3f-vrm-final`** | MIT | Mixamo animations | **Yes** | **Restricted (Mixamo EULA)** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE:** Adopt code patterns; do not redistribute raw Mixamo FBX/GLB. |
| **`Open-LLM-VTuber`** | MIT | Sample avatars (mixed) | **Yes** | **Caution** | Permitted (Code) | Permitted (Code) | Yes | **ADAPT:** Adapt thought isolation and barge-in logic. Exclude avatar models. |
| **`LorisYounger/VPet`** | MIT | Custom anime sprites | **Yes** | **Attribution / Reserved** | Permitted (Code) | Permitted (Code) | Yes | **REFERENCE:** Adopt state machine architecture (enter/hold/exit). |
| **`leon-ai/leon`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Modular capability registry design. |
| **`Mintplex-Labs/anything-llm`**| MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Tool schema validation patterns. |
| **`OpenInterpreter/open-interpreter`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Execution approval confirmation UX. |
| **`szczyglis-dev/py-gpt`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Desktop assistant workflow inspiration. |
| **`janhq/jan`** | AGPL-3.0 | Proprietary Nitro engine | **NO (Copyleft)** | N/A | Contagious | Contagious | Strict | **REFERENCE ONLY:** Clean-room inspiration for VRAM tracking. Zero code imported. |
| **`open-webui/open-webui`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Streaming chat UI conventions. |
| **`DanielSWolf/rhubarb-lip-sync`** | MIT | None | **Yes** | N/A | Permitted | Permitted | Yes | **REFERENCE:** Offline phoneme duration heuristics. |

---

## 3. Verified 3D VRM Model Asset Audit

The models located in `public/models/` have been audited against their embedded metadata and upstream repository licenses:

| Asset Name | Source Origin | License | Commercial Redistribution | Modification Allowed | Credit / Attribution | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`Vita.vrm`** | `madjin/vrm-samples` (VRoid Project) | **CC0 1.0 Universal (Public Domain)** | **Yes** | **Yes** | Not legally required (credited to VRoid) | **APPROVED for distribution & modification** |
| **`Seed-san.vrm`**| `madjin/vrm-samples` (VRM Consortium) | **CC0 1.0 Universal (Public Domain)** | **Yes** | **Yes** | Not legally required (credited to VRMC) | **APPROVED for distribution & modification** |
| **`AvatarSample_B.vrm`** | `pixiv/ChatVRM` (Pixiv Inc.) | **CC0 1.0 Universal (Public Domain)** | **Yes** | **Yes** | Not legally required (credited to Pixiv) | **APPROVED for distribution & modification** |

### Guidelines for Future Proprietary Character Assets
1. Temporary sample avatars (`Vita.vrm`, `Seed-san.vrm`) serve strictly as development and testing benchmarks.
2. The final production release of SUBBU will feature an **original, bespoke 3D character model** crafted specifically for SUBBU with full proprietary IP ownership, avoiding trademark or third-party character claims.

