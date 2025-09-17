import { StageShell } from './StageShell';

export function Stage5TechSpec() {
  return (
    <StageShell
      stageId={5}
      title="Technical Specification"
      inputLabel="Additional technical requirements or implementation details (optional)"
      inputKey="techRequirements"
      placeholder="API contracts, coding standards, test thresholds, performance SLAs, telemetry/observability, auth requirements."
    />
  );
}
