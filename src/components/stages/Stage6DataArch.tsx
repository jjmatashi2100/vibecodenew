import { StageShell } from './StageShell';

export function Stage6DataArch() {
  return (
    <StageShell
      stageId={6}
      title="Data Architecture"
      inputLabel="Additional data requirements or constraints (optional)"
      inputKey="dataRequirements"
      placeholder="Data volume/velocity, PII classes, retention windows, indexing/partitioning, backup (RPO/RTO), compliance (GDPR/PCI)."
    />
  );
}
