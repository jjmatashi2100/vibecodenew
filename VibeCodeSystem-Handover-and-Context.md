# Vibe Code System – Handover and Context

---

## 1  Title & Summary
Desktop Electron + React (Vite) application that guides users through staged product-planning with LLM assistance.  
Uses Electron IPC to communicate with multiple local / cloud LLM providers, persists data in SQLite, and supports export.  
Primary current blocker: improving JSON-output robustness in stage flows (especially Stage 1 & 5).

---

## 2  Primary Use-Case & User Flow
• Stage-driven workflow (Generate → Evaluate → Optimize → Accept) across numbered stages.  
• `StageShell.tsx` orchestrates:
  - Prompt generation via LLM  
  - Auto-continuation & coercion to **strict JSON**  
  - Validation against per-stage schema  
  - Autosave every 10 s and database save on actions  
  - Accept/Reject & cycle navigation  
• Users can iterate over multiple **cycles**; each accepted output is saved per stage/cycle.  
• Critical stages:  
  - **Stage 1 – MVP Definition** (initial JSON plan).  
  - **Stage 5 – Technical Specification** (detailed spec; highly sensitive to JSON format).

---

## 3  Architecture Overview
### Electron Main (`electron/main.ts` → `dist-electron/main.js`)
- Single-instance lock, `BrowserWindow` creation.  
- Dev-server auto-detection in order: `127.0.0.1:3001` → `3000` → `localhost`; falls back to `../build/index.html`.  
- CSP hardening injected only in production; dev warnings silenced with `ELECTRON_DISABLE_SECURITY_WARNINGS=1`.  
- IPC handlers: project DB, context, LLM (via `setupLLMHandlers()`).  
- Database path: `%USERPROFILE%\Documents\VibeCodeSystem\database.db`.

### Preload & Types
- `electron/preload.ts` exposes `window.electronAPI`; types in `src/types/electron.d.ts`.

### Renderer
- React 18 + Vite; TailwindCSS styling; alias `@/` → `src/*` (configured in `tsconfig.json`, `vite.config.ts`).  
- Shadcn-style minimal UI primitives under `src/components/ui/*`.  
- State management with Zustand (`src/stores/*`).

---

## 4  Key Files & Modules
| Purpose | Path |
|---------|------|
| Main process boot & security | `electron/main.ts` |
| LLM provider manager | `electron/ipc/llm.ts` |
| Core stage engine | `src/components/stages/StageShell.tsx` |
| Prompt helpers | `src/utils/prompts.ts` |
| Validation rules | `src/utils/validators.ts` |
| Zustand stores | `src/stores/app.ts`, `src/stores/project.ts` |
| UI primitives | `src/components/ui/*` |
| Build / CSP config | `vite.config.ts`, `tsconfig.json` |

---

## 5  LLM Providers (Electron-side)
Implemented in `electron/ipc/llm.ts`.
| Provider | Default Endpoint | Streaming | Env Var |
|----------|------------------|-----------|---------|
| Ollama | `http://localhost:11434` | SSE | — |
| LM Studio | `http://localhost:1234` | SSE | — |
| OpenAI | `https://api.openai.com` | SSE (chat) | `OPENAI_API_KEY` |
| Anthropic | `https://api.anthropic.com` | SSE | `ANTHROPIC_API_KEY` |
| Gemini | Google endpoint | non-stream | `GEMINI_API_KEY` |

Detection order: **previously-active → Ollama → LM Studio → OpenAI → Anthropic → Gemini**.

IPC channels:  
`llm:check`, `llm:getProviders`, `llm:setProvider`, `llm:getModels`, `llm:generate`, `llm:cancel`.

---

## 6  JSON Output Robustness (Current Focus)
`StageShell.parseJsonStrict()` pipeline:
1. **Fast path** – extract ```json fence or first `{…}` and `JSON.parse`.  
2. **Tolerant path** – steps:  
   - Strip fences/backticks.  
   - Normalize smart quotes `[“”«»]`→`"`, `[‘’]`→`'`.  
   - Trim BOM / whitespace.  
   - `extractFirstBalancedObject()` to get first balanced `{…}`.  
   - Attempt parse → remove trailing commas → parse.  
   - **Last-ditch** `escapeInvalidStringChars()` – escape raw `\n \r \t` inside quoted strings.  
3. **Auto-salvage** in validation effect: if invalid, balanced extraction → canonicalize with `JSON.stringify`.

---

## 7  What’s Been Done (Highlights)
- Escaped backticks in stage6/7 prompt literals.  
- Added shadcn UI primitives & path aliasing.  
- Replaced XState with simple store navigation; excluded legacy dirs from typecheck.  
- Security: dev warning mute, production CSP injection, `preserveSymlinks` fix for Windows junction.  
- Electron dev-server resilience (IPv4 preference, probing, prod fallback).  
- Added OpenAI, Anthropic, Gemini providers with streaming where applicable.  
- Major JSON-parser hardening: continuation-first, balanced extraction, trailing-comma removal, control-char escaping.

---

## 8  Current Issues / Observations
- Stage 1 / 5 still occasionally fail validation when models emit stray prose or incomplete strings; further samples needed.  
- Vite dev server may crash on **Node v22** (`TypeError: … imports`) – use **Node 20 LTS** or rely on production build fallback.  
- IPv6 localhost quirks mitigated by forcing `127.0.0.1`, but watch for binding conflicts.

---

## 9  Remaining Work / Next Steps
- Collect multiple real outputs → test tolerant parser; add simple Jest/Web test harness.  
- Tighten all prompts: demand single top-level JSON, forbid markdown fences.  
- Enhance UI: provider selection dropdown & connection status.  
- Settings panel for API key storage (instead of env-only).  
- Lock dev environment to Node 20.x; add `--host 127.0.0.1 --port 3000` to `vite` in `npm run dev`.  
- UX: surface “Fix JSON” one-click salvage; better error banners.

---

## 10  How to Run (Windows)
```
npm ci                 # install
npm run typecheck      # static types
npm run dev            # vite + electron (NODE_ENV=development)
#  if dev server unstable:
npm run build:react && npm run build:electron
electron .             # production fallback
```
Set cloud keys before launch (PowerShell):
```
$env:OPENAI_API_KEY      = "<key>"
$env:ANTHROPIC_API_KEY   = "<key>"
$env:GEMINI_API_KEY      = "<key>"
```

---

## 11  Data & Persistence
- SQLite DB: `%USERPROFILE%\Documents\VibeCodeSystem\database.db` (auto-created).  
- Autosave: `project.settings.autosave.stage*`.  
- Export: IPC `dialog:export` → user-chosen `.md` / `.json` / `.txt`.

---

## 12  Branches / PRs
| Branch | Purpose | Status |
|--------|---------|--------|
| `fix/ui-shadcn-primitives-and-aliases` | UI primitives, aliasing, dev/prod env tweaks | merged |
| `feat/llm-providers-and-json-validation` | Added OpenAI/Anthropic/Gemini, initial coercion logic | merged |
| `fix/stage5-json-robustness` | **Active** – tolerant parser hardening, Stage 5 prompt tightening, dev-server fallback | open |

---

## 13  Troubleshooting Cheatsheet
- **Blank window** → ensure `http://127.0.0.1:3000` live, else use production build (`npm run build:*`).  
- **JSON validation failed** → copy entire output, rerun through parser or click Accept after auto-salvage.  
- **Vite crash on Node 22** → switch to Node 20.

---

## 14  IPC Reference
Database: `project:create`, `project:load`, `project:list`, `stage:save`, `project:update`, `dialog:export`, `app:version`  
LLM: `llm:check`, `llm:getProviders`, `llm:setProvider`, `llm:getModels`, `llm:generate`, `llm:cancel`

---

## 15  Contact / Next Owner Notes
Start by running Stage 1 & 5 with OpenAI gpt-3.5 in dev mode; capture any invalid JSON outputs and run them through `parseJsonStrict()` to iterate quickly. Focus next on parser unit tests and universal prompt tightening.

*End of handover document.*
