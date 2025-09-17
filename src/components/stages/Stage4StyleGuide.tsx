import { StageShell } from './StageShell';

export function Stage4StyleGuide() {
  return (
    <StageShell
      stageId={4}
      title="Style Guide"
      inputLabel="Design preferences and brand guidelines (optional)"
      inputKey="designPreferences"
      placeholder="Brand/UI preferences: hex colors, font families/sizes, spacing scale, tone, icon style, motion, and WCAG targets."
    />
  );
}
