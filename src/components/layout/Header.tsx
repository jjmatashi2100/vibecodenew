import React, { useState } from 'react';
import { useAppStore } from '../../stores/app';
import { useProjectStore } from '../../stores/project';
import { SettingsPanel } from './SettingsPanel';

export function Header() {
  const {
    llm,
    setSelectedModel,
    setActiveProvider,
    refreshModels,
  } = useAppStore();
  const activeProvider =
    llm.providers.find((p) => p.isActive)?.name || 'lmstudio';

  // local UI state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Current project info
  const {
    currentProject,
    currentCycle,
    setCycle,
    startNewCycle,
    isStageAccepted,
  } = useProjectStore();

  /* ------------------ Cycle helpers ------------------ */
  const maxCycle = Math.max(
    currentProject?.current_cycle || 1,
    ...(currentProject?.stages?.map((r: any) => r.cycle) || [1])
  );

  const allStagesAccepted =
    [1, 2, 3, 4, 5, 6, 7].every((s) => isStageAccepted(s));

  const canStartNewCycle =
    allStagesAccepted &&
    currentCycle === (currentProject?.current_cycle ?? currentCycle);

  const handleModelChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const id = e.target.value;
    if (!id) return;
    setSelectedModel({
      id,
      provider: activeProvider,
      displayName: id,
    });
  };

  return (
    <header className="h-12 bg-gray-850 border-b border-gray-700 flex items-center px-4 justify-between">
      {/* Project title & description */}
      <div className="flex flex-col leading-tight max-w-md">
        <span className="font-semibold truncate">
          {currentProject?.name || 'Vibe Code System'}
        </span>
        {currentProject?.description ? (
          <span className="text-xs text-gray-400 truncate">
            {currentProject.description}
          </span>
        ) : null}
      </div>
      <div className="flex items-center space-x-2">
        {/* Cycle selector */}
        <div className="flex items-center space-x-1">
          <label htmlFor="cycleSel" className="text-xs text-gray-300">
            Cycle
          </label>
          <select
            id="cycleSel"
            value={currentCycle}
            onChange={(e) => setCycle(parseInt(e.target.value, 10))}
            className="bg-gray-700 text-sm text-gray-200 rounded px-2 py-1"
          >
            {Array.from({ length: maxCycle }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Provider selector */}
        <select
          value={
            llm.providers.find((p) => p.isActive)?.name ?? ''
          }
          onChange={(e) => setActiveProvider(e.target.value)}
          className="bg-gray-700 text-sm text-gray-200 rounded px-2 py-1"
        >
          {llm.providers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={llm.selectedModel?.id ?? ''}
          onChange={handleModelChange}
          className="bg-gray-700 text-sm text-gray-200 rounded px-2 py-1"
        >
          <option value="" disabled>
            {llm.availableModels.length
              ? 'Select model'
              : 'No models'}
          </option>
          {llm.availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName ?? m.id}
            </option>
          ))}
        </select>
        <button
          onClick={() => refreshModels()}
          className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
        >
          Refresh
        </button>

        {canStartNewCycle && (
          <button
            onClick={() => startNewCycle()}
            className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded"
          >
            New Cycle
          </button>
        )}
        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
        >
          Settings
        </button>
      </div>
      {/* Settings Panel Modal */}
      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </header>
  );
}
