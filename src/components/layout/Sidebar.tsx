import React from 'react';
import { useProjectStore } from '../../stores/project';

export function Sidebar({ stages, currentStage }: any) {
  const { workflowGoto, isStageAccepted } = useProjectStore();
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
          <span>
            {s.id}. {s.name}
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
