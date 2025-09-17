import { StageShell } from './StageShell';

export function Stage1MVP() {
  return (
    <StageShell
      stageId={1}
      title="MVP Definition"
      inputLabel="Describe your app concept"
      inputKey="concept"
      placeholder="Example: A desktop app that helps developers manage prompts, with offline-first storage and AI model selection."
      hidePrev
      editorHeight="500px"
    />
  );
}
