import { StageShell } from './StageShell';

export function Stage6DataArch() {
  return (
    <StageShell
      stageId={6}
      title="Data Architecture"
      inputLabel="Additional data requirements or constraints (optional)"
      inputKey="dataRequirements"
      placeholder="e.g., Data retention policies, compliance requirements, expected data volume..."
    />
  );
}
