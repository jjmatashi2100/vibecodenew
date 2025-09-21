# DEVELOPMENT_REFERENCE_GUIDE.md

## 1. Project Overview & Goals
Vibe Code System is an Electron-based desktop workbench that guides founders, designers, and engineers from a raw idea to a production-ready technical roadmap through an 8-stage AI-assisted methodology.  
Primary goals  
1. Provide repeatable, high-quality prompt workflows that iterate on user input.  
2. Run **locally** with optional cloud LLMs; treat privacy/cost as first-class.  
3. Persist every prompt/response for auditability and iterative refinement.  
4. Output artifacts (Markdown/JSON) ready for AI coding copilots (Cursor, Claude, Factory.ai, etc.).  

---

## 2. Architecture Decisions & Rationale
| Layer | Decision | Rationale |
|-------|----------|-----------|
| **Shell** | Electron 30 + Vite | Desktop → Easy local LLM access, filesystem exports, no browser CORS. |
| **Frontend** | React 18 + TailwindCSS + Shadcn (planned) | Familiar DX, JIT styling, component library. |
| **State Mgmt** | Zustand (client) + XState (workflow) | Lightweight local state; robust finite-state machine for 8 stages. |
| **LLM Service** | Adapter pattern (TypeScript interfaces) | Hot-swap providers (OpenAI, Anthropic, Ollama, LM Studio). Capabilities flags (`vision`, `streaming`, `functionCalling`). |
| **Persistence** | Prisma 6 + SQLite (better-sqlite3) | Zero setup DB, fast local queries, single file per project portfolio. |
| **IPC** | `electron.ipcMain/Renderer` handlers | Secure bridge from UI to Node layer (DB, file I/O). |
| **Versioning** | Iteration table per stage | Keeps full history, supports diff & rollback. |
| **Prompt Design** | `<goal>/<format>/<warnings-and-guidance>/<context>` | Deterministic output, easy parsing, iterative repetition. |
| **File Task Limit** | ≤15 files per task | Cognitive load & merge-conflict mitigation (Kochel doctrine). |

---

## 3. Implemented So Far
| Area | Files / Path | Status |
|------|--------------|--------|
| **LLM core** | `src/lib/llm/service.ts` | ✔ vision-aware, streaming |
| **Adapters** | `src/lib/llm/adapters/{openai,anthropic}.ts`, Ollama + LM Studio inside service | ✔ |
| **Workflow machine** | `src/lib/workflow/machine.ts` | ✔ 8 states |
| **DB Schema** | `prisma/schema.prisma` | ✔ models: Project, StageData, Iteration, Context, Export |
| **Stage Prompts** | `src/prompts/stages/stage{1-8}.ts` + `index.ts` | ✔ all 8 |
| **Stage Components** | Stage1MVP, Stage2Architecture, Stage4StyleGuide (image upload), Stage7TaskPlan | ✔ |
| **Settings UI** | `src/components/settings/LLMSettings.tsx` | ✔ |
| **Electron main process** | `electron/main.ts` + preload, IPC | ✔ |
| **README & repo** | GitHub `vibecodenew` | ✔ published |

---

## 4. Missing / To Do
1. **UI Kit** – Shadcn components (`Button`, `Card`, `Tabs`, etc.) are imported but not present.  
2. **Remaining Stage Components** – Stage3UserFlow, Stage5TechSpec, Stage6DataArch, Stage8Export.  
3. **Routing / Navigation** – Workspace screen skeleton exists, needs sidebar/progress tracker.  
4. **Export formatters** – Platform-specific exporters (Claude, Cursor…).  
5. **Automated tests** – Vitest/Jest + Playwright.  
6. **CI/CD GitHub Action** – lint, type-check, build.  
7. **Error boundaries & telemetry** (Sentry).  
8. **Prisma migrations for future schema versions**.  
9. **Accessibility audits** – colour contrast, keyboard nav.  
10. **Packaging** – Code-signed installers.

---

## 5. Key Technical Decisions & Patterns
* **Adapter pattern** for LLMs → `LLMAdapter` interface provides `generate()`, `getModels()`, `getCapabilities()`.  
* **Capability flags** – vision gating logic; Stage 4 warns & proposes model switch.  
* **Prompt templates** – stored in TS files, produce string + expected JSON block for programmatic ingestion.  
* **Auto-save debounce** – `useStageData` hook saves after 1 s inactivity.  
* **Iteration history** – Saved on every generation; UI shows version timeline.  
* **Evaluator-Optimizer pattern** (Stage 7) – tasks include success criteria & refactor tips.  

---

## 6. Database Schema (Prisma)
```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  currentStage Int     @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  stages      StageData[]
  contexts    Context[]
}

model StageData {
  id          String   @id @default(cuid())
  projectId   String
  stageNumber Int
  data        Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  iterations  Iteration[]
  project     Project  @relation(fields:[projectId], references:[id], onDelete: Cascade)
  @@unique([projectId, stageNumber])
}

model Iteration {
  id          String   @id @default(cuid())
  stageDataId String
  prompt      String   @db.Text
  response    String   @db.Text
  meta        Json?
  createdAt   DateTime @default(now())
  stageData   StageData @relation(fields:[stageDataId], references:[id], onDelete: Cascade)
}

model Context {
  id        String   @id @default(cuid())
  projectId String
  key       String
  value     Json
  project   Project  @relation(fields:[projectId], references:[id], onDelete: Cascade)
}
```

---

## 7. LLM Integration Details
* **OpenAI adapter** – supports GPT-4, GPT-4-Turbo, GPT-4o (vision), GPT-3.5. Handles stream events, rate-limit headers, image blocks.  
* **Anthropic adapter** – Claude 3 Opus/Sonnet/Haiku with vision; base64 image inline blocks.  
* **Ollama adapter** – local http://localhost:11434, detects vision models (`llava`, `bakllava`).  
* **LM Studio adapter** – OpenAI-compatible; no vision support.  
* Service exposes:  
  ```ts
  generate(prompt, { images, model, temperature })
  currentModelSupportsVision()
  getVisionCapableModels()
  ```
* Secure keys via `electron-store` + OS keychain.

---

## 8. Current Bugs / Issues
1. **UI components missing** – runtime import errors (`Button` etc.).  
2. **Vite dev server port conflict** – fixed by killing 3000 but needs `vite --strictPort`.  
3. **Line-ending warnings** – CRLF vs LF in git.  
4. **No graceful handling when **no** LLM found** – Welcome screen stalls if all adapters fail.  
5. **Stage5/6 prompts generated but components not yet wired**.  

---

## 9. Next Steps (Priority)
1. **Install Shadcn UI & scaffold missing primitives** (High).  
2. Build **Stage3UserFlow** component (High).  
3. **Auto-detect free port** for Vite or add `VITE_PORT`.  
4. Implement **export formatters** (Medium).  
5. Add **unit tests** for LLM service and prompts.  
6. Package **production build** via `electron-builder`.  
7. Integrate **Sentry & Analytics**.  

---

## 10. Code Examples of Key Patterns

### LLM Generation with Vision Guard
```ts
if (options.images && !llmService.currentModelSupportsVision()) {
  throw new LLMServiceError('Model lacks vision capability, switch models.');
}

for await (const chunk of llmService.generate(prompt, options)) {
  response += chunk;              // streaming aggregation
}
```

### Iteration Save (useStageData hook)
```ts
const createdIteration = await window.electron.invoke('iteration:create', {
  stageDataId: currentStageData.id,
  prompt,
  response,
  designPreferences,
  styleGuideImages,
});
setIterations(prev => [createdIteration, ...prev]);
```

### XState Workflow Snippet
```ts
createMachine({
  id: 'vibeWorkflow',
  initial: 'stage1',
  states: {
    stage1: {
      on: { NEXT: 'stage2' }
    },
    stage2: { /* … */ },
    /* … stage8 */
  },
  context: { projectId }
});
```

---

## 11. Dependencies & Versions
(Extract from `package.json`)
- electron 30.5.1  
- react 18.3.1  
- vite 5.4.x  
- typescript 5.9.x  
- prisma 6.16.2 / @prisma/client 6.16.2  
- xstate 5.21.0 / @xstate/react 6.0.0  
- zustand 4.5.x  
- tailwindcss 3.4.x  
- eventsource-parser 1.1.2  
- better-sqlite3 9.6.0  

---

## 12. File Structure Overview
```
electron/              main.ts, preload.js, ipc/
prisma/                schema.prisma
src/
  lib/
    llm/  service.ts, adapters/
    workflow/ machine.ts
  prompts/  stages/
  components/
    settings/ LLMSettings.tsx
    workflow/ Stage{1,2,4,7}.tsx
  hooks/ use-llm.ts, use-stage-data.ts
  stores/ (zustand)
  screens/ Welcome.tsx, Workspace.tsx
assets/
README.md
```

---

## 13. Important Context from Kochel Transcript
Kochel emphasises:  
* Pain-point driven framing (“obsess about the problem”).  
* Iterative question/clarification loop – **LLM must repeat entire updated plan** each turn.  
* Strict **15-file limit** per implementation task.  
* Evaluator-Optimizer pattern (quality gates then refactor pass).  
* XML-style prompt wrappers for deterministic parsing.

---

## 14. 8-Stage Methodology Details
1. **Core Idea & MVP** – capture elevator pitch, problem, USP, features, clarifying Qs.  
2. **Technical Architecture** – high-level system diagram, feature-tech mapping, questions.  
3. **User Flow Mapping** – persona stories, screen states, UX bullet journey.  
4. **Style Guides** – colour/typography/spacing, reference-image analysis.  
5. **Technical Spec** – exhaustive doc: data models, API, testing, deployment.  
6. **Data Architecture** – ERDs, queries, caching, infra sizing, DR.  
7. **Task Plan** – phased breakdown ≤15 files, dependencies, evaluator criteria.  
8. **Export** – merge all into platform-specific bundle.  

Each stage feeds context forward; prompting templates live in `src/prompts/stages`.

---

## 15. Prompt Engineering Patterns Used
* **Role priming** – “You are an experienced SaaS founder…”  
* **XML wrappers** – segregate `goal`, `format`, `warnings-and-guidance`, `context`.  
* **Self-repeat instruction** – “repeat back the entire updated plan”.  
* **Context accumulation** – previous stage JSON passed into `<context>`.  
* **Explicit JSON response spec** – machine-readable outputs for every stage.  
* **Guardrails** – emphasise hard limits (file count), accessibility, etc.  

---

_End of development reference guide_
