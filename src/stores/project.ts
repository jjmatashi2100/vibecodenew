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
      updateContext: (projectId: string, data: any) => Promise<any>;
    };
  }
}

interface ProjectStore {
  currentProject: any;
  currentStage: number;
  stageData: Record<number, any>;
  acceptedStages: number[];
  context: any;
  
  loadProject: (id: string) => Promise<void>;
  saveStageData: (stage: number, data: any) => Promise<void>;
  acceptStage: (stage: number, content: any, extra?: { questions?: any; feedback?: any }) => Promise<void>;
  getContextForStage: (stage: number) => any;
  setCurrentStage: (stage: number) => void;
  isStageAccepted: (stage: number) => boolean;

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
  acceptedStages: [],
  context: {},
  
  loadProject: async (id: string) => {
    try {
      const project = await window.electronAPI.loadProject(id);
      /* -----------------------------------------------------------
         Build maps with ONLY accepted rows (is_accepted === 1)
         For each stage we keep the latest accepted version.
      ----------------------------------------------------------- */
      const acceptedMap: Record<number, any> = {};
      const acceptedList: number[] = [];
      (project.stages || []).forEach((row: any) => {
        if (row.is_accepted) {
          acceptedMap[row.stage_number] = JSON.parse(row.content);
          if (!acceptedList.includes(row.stage_number)) {
            acceptedList.push(row.stage_number);
          }
        }
      });

      set({
        currentProject: project,
        currentStage: project.current_stage ?? 1,
        stageData: acceptedMap,
        acceptedStages: acceptedList,
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

      /* -----------------------------------------------------------
         Immediately refresh currentProject so UI (e.g. Sidebar) has
         access to the newest stage_data rows such as evaluation
         feedback/score that were just inserted.
      ----------------------------------------------------------- */
      try {
        const updatedProject = await window.electronAPI.loadProject(
          get().currentProject.id
        );
        set({ currentProject: updatedProject });
      } catch (e) {
        console.error('Failed to refresh project after stage save:', e);
      }

      // Reflect only accepted versions in local state
      if (data.isAccepted) {
        set((state) => ({
          stageData: {
            ...state.stageData,
            [stage]: data.content
          },
          acceptedStages: state.acceptedStages.includes(stage)
            ? state.acceptedStages
            : [...state.acceptedStages, stage]
        }));
      }
    } catch (error) {
      console.error('Failed to save stage data:', error);
    }
  },
  
  acceptStage: async (stage: number, content: any, extra) => {
    const { questions = [], feedback = [] } = extra || {};
    try {
      await window.electronAPI.saveStageData({
        projectId: get().currentProject.id,
        stageNumber: stage,
        content,
        questions,
        feedback,
        isAccepted: true
      });

      // Update local cache
      set((state) => ({
        stageData: { ...state.stageData, [stage]: content },
        acceptedStages: state.acceptedStages.includes(stage)
          ? state.acceptedStages
          : [...state.acceptedStages, stage]
      }));

      /* -------- Update aggregated context (selected stages only) -------- */
      let partial: any = {};
      if (stage === 1) partial = { global_context: content };
      else if (stage === 2) partial = { tech_stack: content };
      else if (stage === 4) partial = { style_guide: content };
      else if (stage === 6) partial = { data_models: content };

      if (Object.keys(partial).length) {
        try {
          await window.electronAPI.updateContext(get().currentProject.id, partial);
        } catch (err) {
          console.error('Failed to update context:', err);
        }
      }

      // Advance workflow
      get().workflowNext();
    } catch (error) {
      console.error('Accept stage failed:', error);
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
  
  isStageAccepted: (stage: number) => get().acceptedStages.includes(stage),
  
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
