import { StageShell } from './StageShell';

export function Stage2Architecture() {
  return (
    <StageShell
      stageId={2}
      title="Technical Architecture"
      inputLabel="Additional technical constraints or preferences (optional)"
      inputKey="constraints"
      placeholder="Constraints examples: Cloud provider, data residency, preferred languages/frameworks, CI/CD, hosting model, budget, compliance."
    />
  );
}
