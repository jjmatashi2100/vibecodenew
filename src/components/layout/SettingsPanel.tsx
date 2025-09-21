import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { llm, setLLMParams, checkLLMConnection } = useAppStore();
  
  // Convert ms to seconds for UI
  const [unbounded, setUnbounded] = useState(llm.params.unbounded || false);
  const [inactivityTimeout, setInactivityTimeout] = useState(
    Math.floor((llm.params.inactivityMs || 120_000) / 1000)
  );
  const [overallTimeout, setOverallTimeout] = useState(
    Math.floor((llm.params.overallMs || 240_000) / 1000)
  );
  // Minimum MVP features
  const [minFeatures, setMinFeatures] = useState(
    llm.params.minMVPFeatures ?? 3
  );

  /* --------------------- API-key management --------------------- */
  const MASK = '••••••••';
  type Provider = 'openai' | 'anthropic' | 'gemini';
  const [apiKeys, setApiKeys] = useState<Record<Provider, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
  });
  const [showKey, setShowKey] = useState<Record<Provider, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
  });

  // Update local state when store changes
  useEffect(() => {
    setUnbounded(llm.params.unbounded || false);
    setInactivityTimeout(Math.floor((llm.params.inactivityMs || 120_000) / 1000));
    setOverallTimeout(Math.floor((llm.params.overallMs || 240_000) / 1000));
    setMinFeatures(llm.params.minMVPFeatures ?? 3);
  }, [llm.params]);

  // Fetch current secret status on mount
  useEffect(() => {
    (async () => {
      try {
        const status: Record<Provider, boolean> =
          await (window as any).electronAPI.secretsStatus();
        setApiKeys({
          openai: status.openai ? MASK : '',
          anthropic: status.anthropic ? MASK : '',
          gemini: status.gemini ? MASK : '',
        });
      } catch {
        /* ignore errors */
      }
    })();
  }, []);

  const handleApiKeyChange = (provider: Provider, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSave = async () => {
    // 1) Prepare secrets payload
    const payload: Partial<Record<Provider, string | null>> = {};
    (['openai', 'anthropic', 'gemini'] as Provider[]).forEach((p) => {
      const val = apiKeys[p];
      if (val === MASK) return; // unchanged
      if (val.trim() === '') payload[p] = null; // clear
      else payload[p] = val.trim();
    });

    try {
      if (Object.keys(payload).length) {
        await (window as any).electronAPI.secretsSet(payload);
      }
      // Refresh provider detection / models
      await checkLLMConnection();
    } catch {
      /* swallow errors for now */
    }
    // Convert seconds back to milliseconds for storage
    setLLMParams({
      unbounded,
      inactivityMs: inactivityTimeout * 1000,
      overallMs: overallTimeout * 1000,
      minMVPFeatures: minFeatures,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-96 max-w-full">
        <h2 className="text-xl font-bold text-white mb-4">LLM Generation Settings</h2>
        
        {/* ---------------- API Keys ---------------- */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">API Keys</h3>
          {(['openai', 'anthropic', 'gemini'] as Provider[]).map((p) => (
            <div className="mb-4" key={p}>
              <label className="block text-sm font-medium text-gray-300 mb-1 capitalize">
                {p} API Key
              </label>
              <div className="flex">
                <input
                  type={showKey[p] ? 'text' : 'password'}
                  value={apiKeys[p]}
                  placeholder="Enter key or leave blank to clear"
                  onChange={(e) => handleApiKeyChange(p, e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() =>
                    setShowKey((s) => ({ ...s, [p]: !s[p] }))
                  }
                  className="px-3 py-2 bg-gray-600 text-white rounded-r-md hover:bg-gray-500 text-sm"
                >
                  {showKey[p] ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Leave empty and click Save to delete stored key.
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Unbounded generation */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="unbounded"
              checked={unbounded}
              onChange={(e) => setUnbounded(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="unbounded" className="ml-2 text-white">
              Unbounded generation
            </label>
            <div className="ml-2 text-xs text-gray-400">
              (Allows unlimited tokens if provider supports it)
            </div>
          </div>
          
          {/* Inactivity timeout */}
          <div>
            <label htmlFor="inactivity" className="block text-sm font-medium text-gray-300 mb-1">
              Inactivity timeout (seconds)
            </label>
            <input
              type="number"
              id="inactivity"
              min="15"
              max="600"
              value={inactivityTimeout}
              onChange={(e) => setInactivityTimeout(parseInt(e.target.value) || 120)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Abort if no output for this many seconds (15-600)
            </p>
          </div>
          
          {/* Minimum MVP features */}
          <div>
            <label htmlFor="minfeatures" className="block text-sm font-medium text-gray-300 mb-1">
              Minimum MVP features
            </label>
            <input
              type="number"
              id="minfeatures"
              min="1"
              max="10"
              value={minFeatures}
              onChange={(e) => setMinFeatures(Math.min(10, Math.max(1, parseInt(e.target.value) || 3)))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Validator will require at least this many core features (1-10)
            </p>
          </div>

          {/* Overall timeout */}
          <div>
            <label htmlFor="overall" className="block text-sm font-medium text-gray-300 mb-1">
              Overall timeout (seconds)
            </label>
            <input
              type="number"
              id="overall"
              min="30"
              max="1800"
              value={overallTimeout}
              onChange={(e) => setOverallTimeout(parseInt(e.target.value) || 240)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Maximum total generation time in seconds (30-1800)
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
