import React, { useState } from 'react';
import { useAppStore } from '../../stores/app';
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
      <div className="font-semibold">Vibe Code System</div>
      <div className="flex items-center space-x-2">
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
