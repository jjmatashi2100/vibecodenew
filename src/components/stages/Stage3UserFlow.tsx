import { StageShell } from './StageShell';

export function Stage3UserFlow() {
  return (
    <StageShell
      stageId={3}
      title="User Flow"
      inputLabel="Additional user scenarios or journey details (optional)"
      inputKey="userScenarios"
      placeholder="e.g., Describe specific user journeys, key interactions, or scenarios to focus on..."
    />
  );
}
