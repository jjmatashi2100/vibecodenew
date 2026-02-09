declare global {
  interface Window {
    electronAPI: {
      createProject: (data: any) => Promise<any>;
      loadProject: (id: string) => Promise<any>;
      listProjects: () => Promise<any[]>;
      saveStageData: (data: any) => Promise<any>;
      checkLLMConnection: () => Promise<any>;
      getProviders: () => Promise<any>;
      setProvider: (name: string) => Promise<any>;
      getModels: (name: string) => Promise<string[]>;
      generateContent: (prompt: string, options: any) => Promise<string | { error: string }>;
      exportProject: (data: any) => Promise<any>;
      getVersion: () => Promise<string>;
      updateProject: (id: string, data: any) => Promise<any>;
      updateContext: (projectId: string, data: any) => Promise<any>;
      llmConfigGetActive: () => Promise<any>;
      llmConfigSave: (cfg: any) => Promise<any>;
      cancelGenerate: () => void;
    };
  }
}

export {};
