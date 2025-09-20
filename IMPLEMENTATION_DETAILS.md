# IMPLEMENTATION_DETAILS.md

A hands-on guide for finishing **Vibe Code System**. Use this document alongside the `DEVELOPMENT_REFERENCE_GUIDE.md`.

---

## 1. Missing UI Primitives (Shadcn/Tailwind)

All components live in `src/components/ui/`.  
Create an `index.ts` that re-exports each primitive.

### 1.1 Utility ⇒ `cn.ts`
```ts
import { clsx, ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 1.2 Button
```tsx
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

const base =
  "inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const variants = {
  default: "bg-purple-600 text-white hover:bg-purple-700",
  outline: "border border-border hover:bg-accent",
  ghost: "hover:bg-accent/40",
  destructive: "bg-red-600 text-white hover:bg-red-700"
};
const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-lg"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
```

### 1.3 Card
```tsx
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />;
}
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 border-b", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...p} />
);
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 border-t", className)} {...p} />
);
```

### 1.4 Tabs (Radix)
```tsx
import * as TabsPrimitive from "@radix-ui/react-tabs";
export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn("inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1", className)} {...p}/>
);
export const TabsTrigger = React.forwardRef<...>(/* ...similar setup */);
export const TabsContent = TabsPrimitive.Content;
```

### 1.5 Other Quick Primitives
- **Input / Textarea** ⇒ tailwind classes + forwardRef.
- **Spinner**  
```tsx
export const Spinner = ({ className="" }) => (
  <svg className={cn("animate-spin h-5 w-5 text-purple-600", className)} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
  </svg>
);
```

---

## 2. Missing Stage Components – Skeletons

Place in `src/components/workflow/`.

### 2.1 Stage3UserFlow.tsx
```tsx
export default function Stage3UserFlow() {
  // gather previous stage context with useStageData(3)
  // textarea + structured UX bullet editor
  // generator calls stage3Prompt(previousStages, extraRequirements)
  return <div>TODO: User Flow Mapping UI</div>;
}
```

### 2.2 Stage5TechSpec.tsx
```tsx
export default function Stage5TechSpec() {
  // Large markdown viewer w/ mermaid preview
  // Use stage5Prompt(previousStages, technicalReqs)
}
```

### 2.3 Stage6DataArch.tsx
```tsx
export default function Stage6DataArch() {
  // ER diagram upload + text requirements input
  // Generate prompt, display ERD (use mermaid live)
}
```

### 2.4 Stage8Export.tsx
```tsx
export default function Stage8Export() {
  // Select target platform (claude/cursor/replit/etc.)
  // Generate stage8Prompt(previousStages, platform)
  // Save export file via IPC 'dialog:export'
}
```

---

## 3. Shared Patterns & Utilities

| Utility | Path | Purpose |
|---------|------|---------|
| **debounce** | `src/lib/utils/debounce.ts` | Simple trailing debounce used by `useStageData`. |
| **use-toast** | `src/components/ui/use-toast.ts` | Radix Toast provider wrapper. |
| **className merge** | `src/lib/utils/cn.ts` | Provided above. |
| **LLM hook** | `src/hooks/use-llm.ts` | Already coded, ensures vision-capable model detection. |
| **Stage data hook** | `src/hooks/use-stage-data.ts` | Loads/saves stage JSON + iteration history. |

---

## 4. Testing Setup

### 4.1 Install Dev Deps
```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm i -D playwright @playwright/test
```

### 4.2 Vitest Config (`vitest.config.ts`)
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts"
  }
});
```
`vitest.setup.ts`
```ts
import "@testing-library/jest-dom";
```

### 4.3 Example Unit Test
```tsx
// src/components/ui/__tests__/button.test.tsx
import { render } from "@testing-library/react";
import { Button } from "../button";

it("renders children", () => {
  const { getByText } = render(<Button>Hello</Button>);
  expect(getByText("Hello")).toBeInTheDocument();
});
```

### 4.4 Playwright E2E
`playwright.config.ts`
```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { headless: true, viewport: { width: 1280, height: 720 } }
});
```

---

## 5. Deployment Configuration

### 5.1 Electron Builder (`package.json`)
```json
"build": {
  "appId": "com.vibecode.system",
  "productName": "Vibe Code System",
  "files": ["build/**/*", "dist-electron/**/*", "node_modules/**/*", "package.json"],
  "mac": { "target": "dmg" },
  "win": { "target": "nsis" },
  "linux": { "target": "AppImage" }
}
```

Run:
```bash
npm run build          # vite build + tsc
npm run dist           # electron-builder
```

### 5.2 Optional Web Build
For a web-only version (no local LLM), deploy `build/` directory to Vercel/Netlify:
```bash
npm run build:react
vercel deploy --prod
```

---

## 6. Troubleshooting Guide

| Problem | Cause | Fix |
|---------|-------|-----|
| **Vite port 3000 in use** | Another process blocking | `VITE_PORT=5173 npm run dev` or kill port. |
| **LLM “Vision not supported”** | Selected model lacks vision | Switch to GPT-4V, GPT-4o, Claude 3, or Ollama LLaVA via Settings. |
| **Prisma Driver Failure** | DB locked / missing | Delete `prisma/vibe-code.db` and re-run `prisma migrate dev`. |
| **Electron white screen** | Renderer failed to load | Check Vite build, ensure `mainWindow.loadURL('http://localhost:<port>')`. |
| **OpenAI 429** | Rate limited | Backoff 60 s; keys are per-minute limited. |

---

## 7. Quick-Start Commands

| Action | Command |
|--------|---------|
| **Install deps** | `npm install` |
| **Dev mode** | `npm run dev` |
| **Type check** | `npm run typecheck` |
| **Run unit tests** | `npx vitest` |
| **Run e2e tests** | `npx playwright test` |
| **Build prod** | `npm run build` |
| **Package app** | `npm run dist` |

---

## 8. Environment Setup

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma connection string | `file:./vibe-code.db` |
| `OPENAI_API_KEY` | OpenAI key (if using GPT-4/4o) | `sk-...` |
| `ANTHROPIC_API_KEY` | Claude key | `anthropic-sk-...` |
| `OLLAMA_HOST` | Local Ollama URL | `http://localhost:11434` |
| `LM_STUDIO_HOST` | Local LM Studio URL | `http://localhost:1234/v1` |
| `VITE_PORT` | Dev server port override | `5173` |
| `ENCRYPTION_KEY` | 32-byte hex for electron-store | `8f8c...` |

> **Tip:** keep `.env` at project root; never commit it.  
> For Windows, run `setx OPENAI_API_KEY "sk-..."`. For macOS/Linux, export in shell profile.

---

Happy building! 🎉
