# CURRENT_STATE_AND_ACTIONS.md

## 1 · Exact Current State
| Area | Status | Notes |
|------|--------|-------|
| **Repo** | `vibecodenew` on GitHub & local clone at `C:\Users\JJMatashi\Documents\vibecodenew` | Up-to-date with `main` |
| **Electron shell** | ✅ Compiles; main process, preload, IPC wired | Loads renderer if Vite dev server running |
| **LLM core** | ✅ `src/lib/llm/service.ts` + adapters<br>(OpenAI, Anthropic, Ollama, LM Studio) | Vision-capability detection implemented |
| **Workflow engine** | ✅ XState machine with 8 stages | Guards/context present |
| **Stage prompts** | ✅ All 8 prompt templates, XML format | JSON output schema inside each |
| **UI components** | ❌ Primitive UI library missing (`Button`, `Card`, etc.) | Stage components import them ⇒ runtime errors |
| **Stage components** | 1, 2, 4, 7 present; 3, 5, 6, 8 missing | Stage 4 has image upload + vision check |
| **Database** | ✅ Prisma schema; SQLite client generated | Migrations run locally |
| **Settings screen** | ✅ LLM provider / key management | Uses `electron-store` |
| **README / Guides** | ✅ Dev & reference guides generated | Provide clear onboarding |

## 2 · What Works / What Doesn’t
### Works
- Electron app launches main window and IPC.
- LLM adapters connect (OpenAI GPT-4/4o, Claude 3, Ollama).
- Vision detection & image upload logic in Stage 4.
- Stage 1, 2, 4, 7 flows create prompts and stream responses (when primitives mocked).
- Prisma CRUD via IPC (project, stage data, iterations).

### Doesn’t
- Renderer crashes on missing UI primitives (Shadcn components).
- Stage 3, 5, 6, 8 UIs not implemented.
- Navigation / routing incomplete (Workspace sidebar, progress tracker).
- Exporters not implemented → Stage 8 non-functional.
- No automated tests or CI pipeline.
- No graceful handling when **no** LLM available.

## 3 · Critical Blockers
| # | Blocker | Impact |
|---|---------|--------|
| 1 | **Missing UI primitives** (`Button`, `Card`, etc.) | Renderer fails to mount → app unusable |
| 2 | **Stage component gaps** (3, 5, 6, 8) | Workflow cannot progress beyond implemented stages |
| 3 | **Navigation shell** incomplete | Users cannot switch stages cleanly |
| 4 | **No packaging of Shadcn / Tailwind config** | Styling inconsistent once primitives added |

## 4 · Step-by-Step Actions to Get Running
1. **Install Shadcn UI primitives**  
   ```bash
   npm i class-variance-authority clsx tailwind-merge @radix-ui/react-slot
   # generate components (Button/Card/Tabs/Input/Textarea/Alert/Spinner/Toast)
   ```  
2. **Create `/src/components/ui` folder** with primitives (see Implementation Details.md §1).  
3. **Add utility helper:** `src/lib/utils/cn.ts` for class merge.  
4. **Run dev server with port fallback**  
   ```bash
   set VITE_PORT=5173 && npm run dev
   ```  
5. **Verify Stage 1 & 2 render** (create dummy project → run prompts).  
6. **Scaffold missing stage UIs** (empty placeholder components) so XState machine can traverse all 8 states without crashing.  
7. **Add basic sidebar navigation** in Workspace: list stages, highlight current.  
8. **Run Prisma migrate (already done)** but ensure DB path writable: `npx prisma migrate dev`.  
9. **Test LLM connectivity** via Settings screen; switch to GPT-4o for vision demo.  
10. **Package Tailwind config** with custom colours (from Style Guide prompt) to ensure UI consistent.

## 5 · Quick Wins
- Copy Shadcn component templates → fixes 90 % of runtime errors.
- Placeholder Stage 3/5/6/8 components with “Coming soon” → allows full navigation & testing.
- Add `vite --strictPort` flag to avoid silent port clash.
- Implement simple progress bar (stage number / 8) at top of Workspace.
- Use Tailwind dark-mode class to quickly enable dark scheme.

## 6 · Testing Checklist
- [ ] **LLM adapters**: OpenAI ✔ Claude ✔ Ollama ✔ LM Studio ✔
- [ ] **Vision flow**: Upload image → GPT-4o returns colour analysis
- [ ] **Stage traversal**: NEXT button moves machine through all 8 states without crash
- [ ] **Database persistence**: Project reload shows saved stage data + iterations
- [ ] **UI primitives rendering**: Button/Tabs/Card interactive & accessible
- [ ] **Settings**: Save API key → restart → key persists
- [ ] **Rate-limit handling**: Simulate OpenAI 429 → user receives toast
- [ ] **Port clash**: Dev server starts when port 3000 busy

## 7 · Known Working Features
- Stage 1 MVP prompt creation, with JSON + Markdown output.
- Stage 2 Technical architecture diagram (Mermaid) generation.
- Stage 4 Style guide generation with optional image analysis & vision-model prompt.
- Stage 7 Task planner enforcing **15-file** limit with evaluator/optimizer criteria.
- LLM Settings panel with live model list & test connection.

## 8 · Integration Points Needing Attention
1. **UI primitives → Stage components**  
   Ensure new Shadcn components match props currently imported to avoid refactor.
2. **LLM Service ↔ Settings IPC**  
   Persist selected provider & model; propagate capability flags to UI.
3. **XState machine ↔ React Router**  
   Sync URL (`/project/:id/stage/:number`) with machine state.
4. **Prisma ↔ Electron main:**  
   Database path configurable per-user; handle migration errors gracefully.
5. **Exporters (Stage 8) ↔ File system dialog**  
   IPC `dialog:export` needs formatter utilities once implemented.
6. **Mermaid rendering** in Stage 2/5/6 → use `@dimerapp/mermaid` or `@toast-ui/react-chart` to avoid DOM purging.

---

_This document summarises the exact state as of **19 Sep 2025** and provides the concrete steps to reach a runnable MVP._
