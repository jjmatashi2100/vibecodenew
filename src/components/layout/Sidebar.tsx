import React from 'react';
import { useProjectStore } from '../../stores/project';

export function Sidebar({ stages, currentStage }: any) {
  const { workflowGoto } = useProjectStore();
  return (
    <aside className="w-64 bg-gray-850 border-r border-gray-700 p-4 space-y-2">
      {stages.map((s: any) => (
        <button key={s.id} onClick={() => workflowGoto(s.id)}
          className={`w-full text-left px-3 py-2 rounded ${currentStage===s.id?'bg-blue-600':'bg-gray-700 hover:bg-gray-650'}`}>
          {s.id}. {s.name}
        </button>
      ))}
    </aside>
  );
}
