import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Project operations
  createProject: (data: any) => ipcRenderer.invoke('project:create', data),
  loadProject: (id: string) => ipcRenderer.invoke('project:load', id),
  listProjects: () => ipcRenderer.invoke('project:list'),
  saveStageData: (data: any) => ipcRenderer.invoke('stage:save', data),
  
  // LLM operations
  checkLLMConnection: () => ipcRenderer.invoke('llm:check'),
  getProviders: () => ipcRenderer.invoke('llm:getProviders'),
  setProvider: (name: string) => ipcRenderer.invoke('llm:setProvider', name),
  getModels: (name: string) => ipcRenderer.invoke('llm:getModels', name),
  generateContent: (prompt: string, options: any) => {
    return new Promise((resolve) => {
      const channel = `llm:stream:${Date.now()}`;
      lastChannel = channel; // remember for potential cancellation
      
      ipcRenderer.send('llm:generate', { prompt, options, channel });
      
      let content = '';
      const handler = (_event: any, data: any) => {
        if (data.done || data.canceled) {
          ipcRenderer.removeListener(channel, handler);
          resolve(content);
        } else if (data.error) {
          ipcRenderer.removeListener(channel, handler);
          resolve({ error: data.error });
        } else if (data.chunk) {
          content += data.chunk;
        }
      };
      
      ipcRenderer.on(channel, handler);
    });
  },
  
  // File operations
  exportProject: (data: any) => ipcRenderer.invoke('dialog:export', data),
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ----- NEW: project & LLM-config persistence -----
  updateProject: (id: string, data: any) =>
    ipcRenderer.invoke('project:update', { id, data }),

  // context aggregation / persistence
  updateContext: (projectId: string, data: any) =>
    ipcRenderer.invoke('context:update', { projectId, data }),

  llmConfigGetActive: () => ipcRenderer.invoke('llmConfig:getActive'),
  llmConfigSave: (cfg: any) => ipcRenderer.invoke('llmConfig:save', cfg),

  // --- Cancel current LLM generation ---
  cancelGenerate: () => {
    if (lastChannel) {
      ipcRenderer.send('llm:cancel', lastChannel);
    }
  },
});

// Tracks the most-recent LLM stream channel so we can request cancellation
let lastChannel: string | null = null;
