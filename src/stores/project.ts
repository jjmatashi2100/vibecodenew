import { create } from 'zustand';
import { createActor } from 'xstate';
import {
  createWorkflowMachine,
  getCurrentStageFromState,
  getStateIdForStage,
} from '../lib/workflow/machine';

// Define the window.electronAPI interface
declare global {
  interface Window {
    electronAPI: {
      createProject: (data: any) => Promise<any>;
      loadProject: (id: string) => Promise<any>;
      listProjects: () => Promise<any[]>;
      saveStageData: (data: any) => Promise<string>;
      checkLLMConnection: () => Promise<any>;
      generateContent: (prompt: string, options: any) => Promise<string | { error: string }>;
      exportProject: (data: any) => Promise<any>;
      getVersion: () => Promise<string>;
    };
  }
}

interface ProjectStore {
  currentProject: any;
  currentStage: number;
  stageData: Record<number, any>;
  context: any;
  
  loadProject: (id: string) => Promise<void>;
  saveStageData: (stage: number, data: any) => Promise<void>;
  getContextForStage: (stage: number) => any;
  setCurrentStage: (stage: number) => void;

  /* XState workflow helpers */
  startWorkflow: () => void;
  workflowNext: () => void;
  workflowPrev: () => void;
  workflowGoto: (stage: number) => void;
}

/* -----------------------------------------------------------
   Module-scoped XState service handle so the same actor is
   shared across all store instances.
----------------------------------------------------------- */
let workflowService: any = null;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  currentStage: 1,
  stageData: {},
  context: {},
  
  loadProject: async (id: string) => {
    try {
      const project = await window.electronAPI.loadProject(id);
      set({
        currentProject: project,
        currentStage: project.current_stage ?? 1,
        stageData: (project.stages || []).reduce((acc: any, s: any) => { 
          acc[s.stage_number] = JSON.parse(s.content); 
          return acc; 
        }, {}),
        context: project.context || {}
      });
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  },
  
  saveStageData: async (stage: number, data: any) => {
    try {
      await window.electronAPI.saveStageData({ 
        projectId: get().currentProject.id, 
        stageNumber: stage, 
        ...data 
      });
      
      set((state) => ({ 
        stageData: { 
          ...state.stageData, 
          [stage]: data.content 
        } 
      }));
    } catch (error) {
      console.error('Failed to save stage data:', error);
    }
  },
  
  getContextForStage: (stage: number) => {
    const state = get();
    const ctx: any = { 
      project: state.currentProject, 
      previousStages: {} 
    };
    
    for (let i = 1; i < stage; i++) {
      if (state.stageData[i]) {
        ctx.previousStages[`stage${i}`] = state.stageData[i];
      }
    }
    
    return ctx;
  },
  
  /* --------------------  XState integration  -------------------- */

  startWorkflow: () => {
    const initialStage = get().currentStage || 1;

    // Stop existing service if present
    if (workflowService?.stop) workflowService.stop();

    // Create new actor and start it
    workflowService = createActor(createWorkflowMachine(initialStage));

    // Sync Zustand currentStage when machine state changes
    workflowService.subscribe((state: any) => {
      const val = state.value as string;
      const n = getCurrentStageFromState(val);
      if (n !== get().currentStage) {
        set({ currentStage: n });
      }
    });

    workflowService.start();
  },

  workflowNext: () => {
    if (workflowService) workflowService.send({ type: 'NEXT' });
  },

  workflowPrev: () => {
    if (workflowService) workflowService.send({ type: 'PREV' });
  },

  workflowGoto: (stage: number) => {
    const s = Math.max(1, Math.min(8, Math.floor(stage)));
    if (workflowService) workflowService.send({ type: 'GOTO', value: s });
  },
  
  setCurrentStage: (stage: number) => set({ currentStage: stage })
}));
