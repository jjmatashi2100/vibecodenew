import { StageShell } from './StageShell';

export function Stage7TaskPlan() {
  return (
    <StageShell
      stageId={7}
      title="Task Planning"
      inputLabel="Development constraints and preferences (optional)"
      inputKey="taskPreferences"
      placeholder="e.g., Team size, sprint duration, development priorities, resource constraints..."
    />
  );
}
