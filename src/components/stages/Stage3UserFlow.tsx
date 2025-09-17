import { StageShell } from './StageShell';

export function Stage3UserFlow() {
  return (
    <StageShell
      stageId={3}
      title="User Flows"
      inputLabel="Additional user scenarios or journey details (optional)"
      inputKey="userScenarios"
      placeholder="Describe core journeys (onboarding, create project, iterate, evaluate, export), roles, and edge-cases you'd like emphasized."
    />
  );
}
