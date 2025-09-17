import React from 'react';
import { useProjectStore } from '../../stores/project';

export function Sidebar({ stages, currentStage }: any) {
  const { workflowGoto, isStageAccepted, currentProject } = useProjectStore();

  // Helper to fetch latest evaluation score (if any) for a stage
  function getStageScore(stageId: number): number | null {
    const rows = currentProject?.stages?.filter(
      (r: any) => r.stage_number === stageId
    );
    if (!rows || rows.length === 0) return null;

    // iterate from last (latest version) backwards
    for (let i = rows.length - 1; i >= 0; i--) {
      const fbRaw = rows[i].feedback;
      if (fbRaw) {
        try {
          const parsed = JSON.parse(fbRaw);
          if (parsed && typeof parsed.score === 'number') {
            return parsed.score;
          }
        } catch {
          /* ignore parse errors */
        }
      }
    }
    return null;
  }

  return (
    <aside className="w-64 bg-gray-850 border-r border-gray-700 p-4 space-y-2">
      {stages.map((s: any) => (
        <button
          key={s.id}
          onClick={() => workflowGoto(s.id)}
          className={`w-full px-3 py-2 rounded flex items-center justify-between ${
            currentStage === s.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-650'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>
              {s.id}. {s.name}
            </span>
            {(() => {
              const score = getStageScore(s.id);
              return score !== null ? (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-700 text-purple-100">
                  {score}
                </span>
              ) : null;
            })()}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              isStageAccepted(s.id)
                ? 'bg-green-700 text-green-100'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {isStageAccepted(s.id) ? 'Accepted' : 'Draft'}
          </span>
        </button>
      ))}
    </aside>
  );
}
