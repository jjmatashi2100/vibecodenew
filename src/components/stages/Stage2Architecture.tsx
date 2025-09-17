import { StageShell } from './StageShell';

export function Stage2Architecture() {
  return (
    <StageShell
      stageId={2}
      title="Technical Architecture"
      inputLabel="Additional technical constraints or preferences (optional)"
      inputKey="constraints"
      placeholder="e.g., Prefer serverless architecture, must use PostgreSQL, etc."
    />
  );
}
