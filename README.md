# Vibe Code System

Transform product ideas into production-ready technical specifications through a structured, AI-assisted **8-stage methodology**.  
The desktop app (Electron) orchestrates local or cloud LLMs, a workflow engine, and a rich UI to guide founders, designers, and engineers from _napkin sketch → deployable roadmap_.

---

## 1. Project Overview

Vibe Code System is a **prompt-driven workbench** that:

* Captures an idea and progressively refines it through eight well-defined stages.
* Leverages local **Ollama / LM Studio** models or cloud models (OpenAI GPT-4(o)/Vision, Anthropic Claude 3) with real-time model switching.
* Stores every iteration, prompt, and response for full auditability.
* Produces detailed exports ready for coding copilots (Cursor, Replit, Factory.ai, etc.).

---

## 2. Key Features

| Domain | Highlights |
| ------ | ---------- |
| **LLM Integration** | Adapter pattern (OpenAI, Anthropic, Ollama, LM Studio). Vision-capable model detection & image uploads. |
| **Workflow Engine** | XState machine enforces stage order, guards, context accumulation. |
| **Versioning** | Every stage keeps iterations with diffable history. |
| **Style-Guide Image Upload** | Upload up to six reference screenshots; system analyses colours/typography when a vision model is active. |
| **Task Planner** | Granular task breakdown with **15-file hard limit** & evaluator/optimizer workflow. |
| **Multi-Provider Settings** | Secure key storage via `electron-store`/OS keychain. |
| **Exporters** | Generate markdown / JSON packages tailored to Claude, Cursor, Windsurf, Replit, Factory. |

---

## 3. The 8-Stage Methodology

| # | Stage | Output |
| - | ----- | ------ |
| 1 | **Core Idea & MVP Definition** | Elevator pitch, problem, USP, feature list. |
| 2 | **Technical Architecture & System Design** | High-level system diagram, tech stack, architecture questions. |
| 3 | **User Flow Mapping & Interaction Design** | Screen-by-screen journeys with UX/UI considerations. |
| 4 | **Style Guides & State Designs** | Colour palette, typography, component states, image analysis. |
| 5 | **Comprehensive Technical Specification** | Exact data models, API contracts, diagrams, testing strategy. |
| 6 | **Data Architecture & Infrastructure Planning** | ERDs, migrations, scaling, DR/backup, cost analysis. |
| 7 | **Detailed Task-by-Task Plan** | Phased roadmap with ≤15 files/task, dependencies, evaluator checks. |
| 8 | **Export & Handoff** | Platform-optimised package for AI coding assistants. |

Each stage’s prompt follows a strict `<goal> / <format> / <warnings-and-guidance> / <context>` XML structure and repeats back the full plan after every user clarification to ensure nothing is lost.

---

## 4. Tech Stack

* **Electron 30** + **Vite** – cross-platform desktop shell.
* **React 18** + **Tailwind CSS 3** – UI layer (moving to Shadcn UI).
* **XState 5** – workflow/state machine.
* **Prisma 6** + **SQLite (better-sqlite3)** – local persistence.
* **LLM Adapters** – OpenAI, Anthropic, Ollama, LM Studio.
* **Zustand** – lightweight client state.
* **Typescript 5** – end-to-end type safety.

---

## 5. Installation

```bash
# 1. Clone
git clone https://github.com/your-org/vibecodenew.git
cd vibecodenew

# 2. Install dependencies
npm install

# 3. Generate Prisma client & create DB
npx prisma generate
npx prisma migrate dev --name init

# 4. Add environment variables
cp .env.example .env
#   → add OpenAI / Anthropic keys, or keep empty for local Ollama.

# 5. Start in dev mode
npm run dev    # launches Vite, TypeScript watch, and Electron
```

> **Ports**  
> • Vite dev server: `3000` (set `VITE_PORT` if occupied)  
> • Ollama default: `11434`  
> • LM Studio default: `1234/v1`

---

## 6. Current Status & Roadmap

### Current Status (Alpha)

* Core infrastructure solid; app **runs** but missing Shadcn UI components.
* Stages 1, 2, 4, 7 implemented; stages 3, 5, 6, 8 under construction.
* Vision model support complete; UI warns & prompts model switch.

### Roadmap

1. **UI Library Integration** – add Shadcn UI to supply Button/Card/etc.
2. **Finish Remaining Stages** – components + prompts for 3, 5, 6, 8.
3. **Exporters** – implement Formatter plugins.
4. **Automated Tests** – Vitest & Playwright.
5. **Packaging** – code-signed installers (Win/macOS/Linux).
6. **Plugin SDK** – allow custom prompt stages & exporters.

---

## 7. Contributing

Thank you for considering a contribution! We welcome PRs that improve code quality, documentation, or feature breadth.

1. **Fork** the repo & **clone** your fork.
2. **Create a branch**: `git checkout -b feat/your-feature`.
3. **Code style**:  
   * ESLint + Prettier (run `npm run lint`).  
   * Use **Conventional Commits** (`feat:`, `fix:`, `docs:` …).
4. **Test** locally: `npm run dev`, ensure lint & type checks pass.
5. **Commit & push**: `git push origin feat/your-feature`.
6. **Open a Pull Request** – fill out the PR template.
7. Stay responsive to CI feedback & review comments.

All contributors must abide by the [Contributor Covenant](https://contributor-covenant.org) Code of Conduct.

---

### License

MIT © 2025 The San Francisco AI Factory
