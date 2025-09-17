import { create } from 'zustand';

interface LLMProvider {
  name: string;
  endpoint: string;
  isActive: boolean;
}

interface LLMModel {
  id: string;
  provider: string;
  displayName?: string;
}

interface LLMParams {
  temperature: number;
  topP: number;
  maxTokens: number;
  repeatPenalty: number;
  seed?: number;
  /** Allow provider-side unlimited generation if supported */
  unbounded?: boolean;
  /** Abort stream if no chunk arrives within this many ms */
  inactivityMs?: number;
  /** Abort the whole request after this many ms */
  overallMs?: number;
}

interface LLMConfig {
  providers: LLMProvider[];
  availableModels: LLMModel[];
  selectedModel: LLMModel | null;
  params: LLMParams;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage?: string;
}

interface AppState {
  currentProject: any;
  llm: LLMConfig;
  
  // Actions
  setCurrentProject: (project: any) => void;
  checkLLMConnection: () => Promise<{ provider: string, models: string[] } | null>;
  setSelectedModel: (model: LLMModel) => void;
  setLLMParams: (params: Partial<LLMParams>) => void;
  updateConnectionStatus: (status: LLMConfig['connectionStatus'], error?: string) => void;
  updateAvailableModels: (provider: string, models: string[]) => void;
  setActiveProvider: (name: string) => Promise<void>;
  refreshModels: (provider?: string) => Promise<void>;
}

const defaultLLMParams: LLMParams = {
  temperature: 0.3,
  topP: 0.9,
  maxTokens: 700,
  repeatPenalty: 1.15,
  unbounded: false,
  inactivityMs: 120_000,
  overallMs: 240_000,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  llm: {
    providers: [
      { name: 'ollama',   endpoint: 'http://localhost:11434', isActive: false },
      { name: 'lmstudio', endpoint: 'http://localhost:1234',  isActive: false }
    ],
    availableModels: [],
    selectedModel: null,
    params: defaultLLMParams,
    connectionStatus: 'disconnected',
  },
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  checkLLMConnection: async () => {
    const { updateConnectionStatus, updateAvailableModels, setSelectedModel, refreshModels } = get();
    
    try {
      updateConnectionStatus('connecting');
      /* -----------------------------------------------------------
         Attempt to hydrate from persisted LLM configuration first
      ------------------------------------------------------------*/
      const persisted = await (window as any).electronAPI.llmConfigGetActive?.();
      if (persisted && persisted.provider) {
        // Switch provider (this also marks it active in state & IPC)
        await get().setActiveProvider(persisted.provider);
        // Ensure models list is fresh for that provider
        await refreshModels(persisted.provider);

        // If persisted model exists in freshly-fetched list, re-select it
        if (persisted.model) {
          const ids = get().llm.availableModels.map(m => m.id);
          if (ids.includes(persisted.model)) {
            setSelectedModel({
              id: persisted.model,
              provider: persisted.provider,
              displayName: persisted.model
            });
          }
        }
      }

      const result = await (window as any).electronAPI.checkLLMConnection();
      
      if (result) {
        // Update providers active status
        set((state) => ({
          llm: {
            ...state.llm,
            providers: state.llm.providers.map(p => ({
              ...p,
              isActive: p.name === result.provider
            }))
          }
        }));
        
        // Update available models
        updateAvailableModels(result.provider, result.models);
        
        // Set default model if none selected (don't overwrite existing selection)
        if (!get().llm.selectedModel && result.models.length > 0) {
          // Prefer Llama 3.1 8B for fast operations if available
          const defaultModelId = result.models.find((m: string) => 
            m.toLowerCase().includes('llama') && 
            m.includes('3.1') && 
            m.includes('8b')
          ) || result.models[0];
          
          get().setSelectedModel({
            id: defaultModelId,
            provider: result.provider,
            displayName: defaultModelId
          });
        }
        
        updateConnectionStatus('connected');
        return result;
      } else {
        updateConnectionStatus('error', 'No LLM providers detected');
        return null;
      }
    } catch (error) {
      updateConnectionStatus('error', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  },
  
  setSelectedModel: (model) => {
    // 1) update store
    set((state) => ({
      llm: {
        ...state.llm,
        selectedModel: model,
      },
    }));

    // 2) persist selection (fire-and-forget)
    try {
      (window as any).electronAPI.llmConfigSave?.({
        provider: model.provider,
        endpoint: get().llm.providers.find((p) => p.name === model.provider)?.endpoint,
        model: model.id,
        is_active: true,
        parameters: get().llm.params,
      });
    } catch {
      /* ignore persistence errors */
    }
  },
  
  /* -----------------------------------------------------------
     Merge and persist updated LLM parameters
  ----------------------------------------------------------- */
  setLLMParams: (params) => {
    set((state) => ({
      llm: {
        ...state.llm,
        params: {
          ...state.llm.params,
          ...params,
        },
      },
    }));

    // Fire-and-forget persistence of the new param set
    try {
      const state = get();
      const activeProvider = state.llm.providers.find((p) => p.isActive);
      if (activeProvider) {
        (window as any).electronAPI.llmConfigSave?.({
          provider: activeProvider.name,
          endpoint: activeProvider.endpoint,
          model: state.llm.selectedModel?.id,
          is_active: true,
          parameters: state.llm.params, // already merged above
        });
      }
    } catch {
      /* swallow persistence errors */
    }
  },
  
  updateConnectionStatus: (status, error) => set((state) => ({
    llm: {
      ...state.llm,
      connectionStatus: status,
      errorMessage: error
    }
  })),
  
  updateAvailableModels: (provider, models) => set((state) => ({
    llm: {
      ...state.llm,
      availableModels: models.map(id => ({
        id,
        provider,
        displayName: id
      }))
    }
  })),
  
  setActiveProvider: async (name) => {
    const { updateConnectionStatus, updateAvailableModels, setSelectedModel } = get();
    
    try {
      updateConnectionStatus('connecting');
      const success = await (window as any).electronAPI.setProvider(name);
      
      if (success) {
        // Update providers active status
        set((state) => ({
          llm: {
            ...state.llm,
            providers: state.llm.providers.map(p => ({
              ...p,
              isActive: p.name === name
            }))
          }
        }));
        
        // Get models for the new provider
        const models = await (window as any).electronAPI.getModels(name);
        
        // Update available models
        updateAvailableModels(name, models);
        
        // Set default model if provider changed or none selected
        const currentModel = get().llm.selectedModel;
        if (!currentModel || currentModel.provider !== name) {
          if (models.length > 0) {
            setSelectedModel({
              id: models[0],
              provider: name,
              displayName: models[0]
            });
          } else {
            set((state) => ({
              llm: {
                ...state.llm,
                selectedModel: null
              }
            }));
          }
        }
        
        updateConnectionStatus('connected');

        // Persist the new active provider & current model
        try {
          await (window as any).electronAPI.llmConfigSave({
            provider: name,
            endpoint: get().llm.providers.find(p => p.name === name)?.endpoint,
            model: get().llm.selectedModel?.id,
            is_active: true,
            parameters: get().llm.params
          });
        } catch { /* swallow persistence errors */ }
      } else {
        updateConnectionStatus('error', `Failed to set provider: ${name}`);
      }
    } catch (error) {
      updateConnectionStatus('error', error instanceof Error ? error.message : 'Unknown error');
    }
  },
  
  refreshModels: async (provider) => {
    const { updateAvailableModels, updateConnectionStatus } = get();
    
    try {
      // Determine which provider to refresh
      const targetProvider = provider || get().llm.providers.find(p => p.isActive)?.name;
      
      if (!targetProvider) {
        updateConnectionStatus('error', 'No active provider to refresh models');
        return;
      }
      
      updateConnectionStatus('connecting');
      const models = await (window as any).electronAPI.getModels(targetProvider);
      
      if (models && models.length > 0) {
        updateAvailableModels(targetProvider, models);
        updateConnectionStatus('connected');
      } else {
        updateConnectionStatus('error', `No models found for provider: ${targetProvider}`);
      }
    } catch (error) {
      updateConnectionStatus('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}));
