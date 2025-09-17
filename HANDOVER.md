<facThinking>
Creating file: HANDOVER.md with full hand-over document exactly as requested.
</facFileContent>
# Vibe Code System — Handover Document

Use this to brief a new chat and continue development without re-deriving context.

## TL;DR
- Windows desktop app (Electron + React + TypeScript) that guides users through 8 stages to turn an app idea into detailed specs, using local LLMs only.
- Supports both LM Studio (http://127.0.0.1:1234) and Ollama (http://localhost:11434) with live provider switching and model selection.
- Current blocker resolved: streaming stalls; added inactivity/overall timeouts and partial-output finishing. Stage 1 token budget increased.
- Next priorities: persistence of provider/model across restarts, autosave + crash recovery, prompt templates, state machine (XState), production build/installer.

---

## What’s Built
- Electron main/preload with secure IPC and SQLite persistence.
- React app with 8 stages, Zustand stores, status bar, and a header with provider + model dropdowns.
- LLM manager that:
  - Detects providers, prefers the user-selected provider, and streams tokens.
  - Handles LM Studio and Ollama endpoints.
  - Guards against stall with 45 s inactivity timeout and 4-minute overall timeout; if stall occurs after partial output, it finalizes gracefully.

## How to Run (dev)
1. Build renderer  
   `npm run build:react`
2. Build Electron main  
   `npm run build:electron`
3. Launch  
   `npm start`

Notes  
- CSP/Autofill warnings in dev are expected; they disappear in packaged builds.  
- Ensure Node.js 22.x is installed; Python 3.12 + VS Build Tools were previously required by better-sqlite3 (prebuilt binary now used).

## LLM Providers (How to use)
LM Studio  
- Turn on API server at `http://127.0.0.1:1234`.  
- Start a small instruct model (e.g., `qwen2.5-7b-instruct`, `llama-3.1-8b-instruct`).

Ollama  
- Ensure service is running at `http://localhost:11434` with models pulled (e.g., `gemma3:1b`).

In the app  
1. Header (top-right) → choose provider (first dropdown).  
2. Click “Refresh” to load models for the active provider.  
3. Choose model (second dropdown).  
4. Status bar (bottom-left) shows `LLM: connected • <provider> • <model>`.

## Current Status
- Stage 1 “Generate MVP Plan” works with higher token budget and stall handling; long outputs may still be truncated by model limits or VRAM.
- Persistence: stage data saves with auto-versioning to avoid UNIQUE constraint errors.
- Provider switching: respected; auto-detect no longer overrides manual choice.

## Key Fixes Implemented
- **Database versioning** (`electron/ipc/database.ts`)  
  `saveStageData` auto-increments `version` per `(project_id, stage_number)`.
- **Provider selection & refresh** (`src/components/layout/Header.tsx`, `src/stores/app.ts`, `electron/preload.ts`, `electron/ipc/llm.ts`)  
  Added provider dropdown, model dropdown, refresh for active provider only; detection honors user selection.
- **Streaming robustness** (`electron/ipc/llm.ts`)  
  45 s inactivity, 4 min overall timeout; graceful finish after partial output.  
  LM Studio: primary `POST /v1/chat/completions` (SSE), fallback `POST /v1/completions`.  
  Ollama: `POST /api/generate` line-delimited JSON.
- **Stage 1 token budget** (`src/components/stages/Stage1MVP.tsx`) increased to 1800.

## Known / Resolved Issues
- Vite asset path → `base: "./"` in `vite.config.ts`.  
- ESM scope error → removed `"type": "module"` from `package.json`.  
- better-sqlite3 build on Windows → switched to prebuilt binary.  
- Stage 1 hang with LM Studio → fixed via Web Streams & timeouts.  
- Dev-only warnings (CSP, Autofill) are harmless.

## Architecture Overview
Electron  
- `electron/main.ts` – app lifecycle, IPC registration.  
- `electron/preload.ts` – secure bridge exposing APIs.  
- `electron/ipc/database.ts` – SQLite schema (`projects`, `stage_data`, `context`, `exports`, `llm_config`).  
- `electron/ipc/llm.ts` – provider classes, stall guards, generate streaming.

React  
- `src/stores/app.ts` – LLM provider/model state & params.  
- `src/stores/project.ts` – project & stage data.  
- `src/components/layout/Header.tsx` – provider/model selectors + refresh.  
- `src/components/layout/StatusBar.tsx` – active provider/model display.  
- `src/components/stages/*` – stage UIs; Stage 1 implemented.

## Troubleshooting
- **“LLM stream stalled …”**  
  • Ensure model is running, or pick a smaller model (7 – 8 B).  
  • Keep provider set to LM Studio, Refresh models, re-select model.
- **“UNIQUE constraint failed … stage_data”**  
  Fixed via auto-versioning; restart app if seen once after upgrade.
- **Blank window**  
  Run `npm run build:react` before `npm start`.
- **Provider flips unexpectedly**  
  Fixed; verify header dropdown shows correct provider.

## Next Steps (High Priority)
1. Persist LLM provider & model across restarts.  
2. Autosave outputs + crash recovery.  
3. Prompt templates & configurable system prompts per stage.  
4. Introduce XState (or similar) for 8-stage workflow orchestration.  
5. Production build & Windows installer (electron-builder); test on clean machine.  
6. Improve Stage 1 continuation (auto-continue if near token limit).

## Commands
```
npm run build:electron   # build main
npm run build:react      # build renderer
npm start                # launch app
```

## Paste This Into The New Chat
We’re building “Vibe Code System,” an Electron + React + TypeScript Windows app that guides users through 8 stages to convert an app idea into technical specs using local LLMs only. It supports both LM Studio (127.0.0.1:1234) and Ollama (localhost:11434) with provider/model dropdowns in the header and a status bar reflecting the active selection.

Environment: Node 22.x, SQLite via better-sqlite3, Vite with `base: "./"`.

Recent fixes: robust streaming (45 s inactivity, 4 min overall), respected provider switching, auto-versioned stage data, Stage 1 token budget = 1800.

Run steps:
1. `npm run build:react`
2. `npm run build:electron`
3. `npm start`
In app: select provider (LM Studio), Refresh, pick running instruct model, Generate.

Please continue with:
- Persist provider/model across restarts.
- Add autosave + crash recovery.
- Add prompt templates per stage.
- Introduce XState for 8-stage flow.
- Build installer and test on clean Windows.

If stalls occur, ensure model is running in LM Studio and try a smaller instruct model (`qwen2.5-7b-instruct`, `llama-3.1-8b-instruct`).
</facFileContent>