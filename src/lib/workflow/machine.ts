import { createMachine, assign } from 'xstate';

// Types for the workflow context
export interface WorkflowContext {
  projectId: string;
  currentStage: number;
  stageData: Record<number, StageData>;
  globalContext: GlobalContext;
  isGenerating: boolean;
  error?: string;
  unsavedChanges: boolean;
}

// Types for stage data
export interface StageData {
  content: string;
  questions?: string[];
  feedback?: string[];
  isAccepted: boolean;
  version: number;
}

// Types for global context that accumulates across stages
export interface GlobalContext {
  features?: any[];
  techStack?: any;
  styleGuide?: any;
  dataModels?: any;
  userFlows?: any[];
}

// Types for workflow events
export type WorkflowEvent =
  | { type: 'GENERATE'; prompt?: string }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'ACCEPT' }
  | { type: 'ITERATE'; feedback: string[] }
  | { type: 'EDIT'; content: string }
  | { type: 'SAVE' }
  | { type: 'EXPORT'; platform: string }
  | { type: 'LOAD_PROJECT'; projectId: string; data: any }
  | { type: 'SET_STAGE'; stage: number }
  | { type: 'ERROR'; message: string };

// Initial context
const initialContext: WorkflowContext = {
  projectId: '',
  currentStage: 1,
  stageData: {},
  globalContext: {},
  isGenerating: false,
  unsavedChanges: false
};

// Create the workflow state machine
export const workflowMachine = createMachine({
  id: 'vibeCodeWorkflow',
  initial: 'stage1',
  context: initialContext,
  states: {
    stage1: {
      entry: assign({
        currentStage: 1
      }),
      on: {
        GENERATE: 'generating',
        NEXT: {
          target: 'stage2',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        },
        LOAD_PROJECT: {
          actions: ['loadProject', 'updateContext']
        }
      }
    },
    stage2: {
      entry: assign({
        currentStage: 2
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage1',
        NEXT: {
          target: 'stage3',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage3: {
      entry: assign({
        currentStage: 3
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage2',
        NEXT: {
          target: 'stage4',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage4: {
      entry: assign({
        currentStage: 4
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage3',
        NEXT: {
          target: 'stage5',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage5: {
      entry: assign({
        currentStage: 5
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage4',
        NEXT: {
          target: 'stage6',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage6: {
      entry: assign({
        currentStage: 6
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage5',
        NEXT: {
          target: 'stage7',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage7: {
      entry: assign({
        currentStage: 7
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage6',
        NEXT: {
          target: 'stage8',
          guard: 'isStageComplete'
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    stage8: {
      entry: assign({
        currentStage: 8
      }),
      on: {
        GENERATE: 'generating',
        PREVIOUS: 'stage7',
        EXPORT: 'exporting',
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    generating: {
      entry: assign({
        isGenerating: true,
        error: undefined
      }),
      invoke: {
        id: 'generateStageContent',
        src: 'generateStageContent',
        onDone: {
          target: 'reviewing',
          actions: [
            assign((context, event) => ({
              stageData: {
                ...context.stageData,
                [context.currentStage]: {
                  content: event.data.content,
                  questions: event.data.questions || [],
                  feedback: [],
                  isAccepted: false,
                  version: (context.stageData[context.currentStage]?.version || 0) + 1
                }
              },
              isGenerating: false,
              unsavedChanges: true
            })),
            'updateContext'
          ]
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message || 'Failed to generate content',
            isGenerating: false
          })
        }
      }
    },
    reviewing: {
      on: {
        ACCEPT: {
          target: 'saved',
          actions: assign((context) => ({
            stageData: {
              ...context.stageData,
              [context.currentStage]: {
                ...context.stageData[context.currentStage],
                isAccepted: true
              }
            }
          }))
        },
        ITERATE: {
          target: 'generating',
          actions: assign((context, event) => ({
            stageData: {
              ...context.stageData,
              [context.currentStage]: {
                ...context.stageData[context.currentStage],
                feedback: event.feedback
              }
            }
          }))
        },
        EDIT: {
          target: 'editing',
          actions: 'setEditContent'
        }
      }
    },
    editing: {
      on: {
        SAVE: {
          target: 'saved',
          actions: [
            assign((context, event: any) => ({
              stageData: {
                ...context.stageData,
                [context.currentStage]: {
                  ...context.stageData[context.currentStage],
                  content: event.content,
                  isAccepted: true
                }
              },
              unsavedChanges: true
            })),
            'updateContext'
          ]
        },
        GENERATE: 'generating'
      }
    },
    saved: {
      entry: 'saveToDatabase',
      always: [
        {
          target: 'stage1',
          cond: (context) => context.currentStage === 1
        },
        {
          target: 'stage2',
          cond: (context) => context.currentStage === 2
        },
        {
          target: 'stage3',
          cond: (context) => context.currentStage === 3
        },
        {
          target: 'stage4',
          cond: (context) => context.currentStage === 4
        },
        {
          target: 'stage5',
          cond: (context) => context.currentStage === 5
        },
        {
          target: 'stage6',
          cond: (context) => context.currentStage === 6
        },
        {
          target: 'stage7',
          cond: (context) => context.currentStage === 7
        },
        {
          target: 'stage8',
          cond: (context) => context.currentStage === 8
        }
      ],
      exit: assign({
        unsavedChanges: false
      })
    },
    error: {
      on: {
        GENERATE: 'generating',
        PREVIOUS: {
          actions: 'clearError',
          target: (context) => `stage${context.currentStage}`
        }
      }
    },
    exporting: {
      invoke: {
        id: 'exportProject',
        src: 'exportProject',
        onDone: {
          target: 'stage8',
          actions: 'notifyExportSuccess'
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message || 'Failed to export project'
          })
        }
      }
    }
  },
  on: {
    SET_STAGE: {
      actions: assign({
        currentStage: (_, event) => event.stage
      }),
      target: (_, event) => `stage${event.stage}`
    },
    ERROR: {
      target: 'error',
      actions: assign({
        error: (_, event) => event.message
      })
    }
  }
}, {
  guards: {
    isStageComplete: (context) => {
      return !!context.stageData[context.currentStage]?.isAccepted;
    },
    canMoveNext: (context) => {
      return context.currentStage < 8 && !!context.stageData[context.currentStage]?.isAccepted;
    },
    hasUnsavedChanges: (context) => {
      return context.unsavedChanges;
    }
  },
  actions: {
    saveToDatabase: () => {
      // Will be implemented by the actual service
    },
    updateContext: (context) => {
      // Extract data from stages to update global context
      const globalContext: GlobalContext = {};
      
      // Extract features from stage 1
      if (context.stageData[1]?.content) {
        try {
          const stage1Data = JSON.parse(context.stageData[1].content);
          globalContext.features = stage1Data.features || [];
        } catch (e) {
          console.error('Failed to parse stage 1 data:', e);
        }
      }
      
      // Extract tech stack from stage 2
      if (context.stageData[2]?.content) {
        try {
          const stage2Data = JSON.parse(context.stageData[2].content);
          globalContext.techStack = stage2Data.techStack || {};
        } catch (e) {
          console.error('Failed to parse stage 2 data:', e);
        }
      }
      
      // Extract user flows from stage 3
      if (context.stageData[3]?.content) {
        try {
          const stage3Data = JSON.parse(context.stageData[3].content);
          globalContext.userFlows = stage3Data.userFlows || [];
        } catch (e) {
          console.error('Failed to parse stage 3 data:', e);
        }
      }
      
      // Extract style guide from stage 4
      if (context.stageData[4]?.content) {
        try {
          const stage4Data = JSON.parse(context.stageData[4].content);
          globalContext.styleGuide = stage4Data.styleGuide || {};
        } catch (e) {
          console.error('Failed to parse stage 4 data:', e);
        }
      }
      
      // Extract data models from stage 6
      if (context.stageData[6]?.content) {
        try {
          const stage6Data = JSON.parse(context.stageData[6].content);
          globalContext.dataModels = stage6Data.dataModels || {};
        } catch (e) {
          console.error('Failed to parse stage 6 data:', e);
        }
      }
      
      context.globalContext = globalContext;
    },
    clearError: assign({
      error: undefined
    }),
    setEditContent: () => {
      // Will be implemented by the actual service
    },
    loadProject: assign((_, event: any) => ({
      projectId: event.projectId,
      stageData: event.data.stageData || {},
      globalContext: event.data.globalContext || {},
      currentStage: event.data.currentStage || 1
    })),
    notifyExportSuccess: () => {
      // Will be implemented by the actual service
    }
  }
});
