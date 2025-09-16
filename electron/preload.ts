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
      
      ipcRenderer.send('llm:generate', { prompt, options, channel });
      
      let content = '';
      const handler = (_event: any, data: any) => {
        if (data.done) {
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

  llmConfigGetActive: () => ipcRenderer.invoke('llmConfig:getActive'),
  llmConfigSave: (cfg: any) => ipcRenderer.invoke('llmConfig:save', cfg),
});
