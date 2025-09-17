import { StageShell } from './StageShell';

export function Stage1MVP() {
  return (
    <StageShell
      stageId={1}
      title="MVP Definition"
      inputLabel="Describe your app concept"
      inputKey="concept"
      placeholder="A desktop app that helps developers..."
      hidePrev
      editorHeight="400px"
    />
  );
}
