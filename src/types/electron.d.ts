declare global {
  interface Window {
    electronAPI: {
      createProject: (data: any) => Promise<any>;
      loadProject: (id: string) => Promise<any>;
      listProjects: () => Promise<any[]>;
      saveStageData: (data: any) => Promise<any>;
      checkLLMConnection: () => Promise<any>;
      generateContent: (prompt: string, options: any) => Promise<string | { error: string }>;
      exportProject: (data: any) => Promise<any>;
      getVersion: () => Promise<string>;
    };
  }
}

export {};
