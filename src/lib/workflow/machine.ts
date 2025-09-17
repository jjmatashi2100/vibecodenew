import { createMachine } from 'xstate';

/**
 * Helper to get the state ID for a given stage number
 * Clamps the stage number to valid bounds (1-8)
 */
export function getStateIdForStage(n: number): string {
  // Clamp to valid range
  const stage = Math.max(1, Math.min(8, Math.floor(n)));
  return `stage${stage}`;
}

/**
 * Type for workflow machine events
 */
type WorkflowEvent =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; value: number };

/**
 * Type for workflow machine context
 */
interface WorkflowContext {
  currentStage: number;
}

/**
 * Creates a state machine for the 8-stage workflow
 * @param initialStage - The initial stage to start at (default: 1)
 */
export function createWorkflowMachine(initialStage = 1) {
  // Ensure initial stage is within bounds
  const validInitialStage = Math.max(1, Math.min(8, Math.floor(initialStage)));
  const initialStateId = getStateIdForStage(validInitialStage);

  return createMachine({
    id: 'workflow',
    initial: initialStateId,
    context: {
      currentStage: validInitialStage
    },
    states: {
      stage1: {
        on: {
          NEXT: {
            target: 'stage2',
          },
          PREV: {
            // Stay in stage1 if already at stage1
            target: 'stage1',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage2: {
        on: {
          NEXT: {
            target: 'stage3',
          },
          PREV: {
            target: 'stage1',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage3: {
        on: {
          NEXT: {
            target: 'stage4',
          },
          PREV: {
            target: 'stage2',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage4: {
        on: {
          NEXT: {
            target: 'stage5',
          },
          PREV: {
            target: 'stage3',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage5: {
        on: {
          NEXT: {
            target: 'stage6',
          },
          PREV: {
            target: 'stage4',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage6: {
        on: {
          NEXT: {
            target: 'stage7',
          },
          PREV: {
            target: 'stage5',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage7: {
        on: {
          NEXT: {
            target: 'stage8',
          },
          PREV: {
            target: 'stage6',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
      stage8: {
        on: {
          NEXT: {
            // Stay in stage8 if already at stage8
            target: 'stage8',
          },
          PREV: {
            target: 'stage7',
          },
          GOTO: [
            { guard: (_: any, e: any) => e && e.value === 1, target: 'stage1' },
            { guard: (_: any, e: any) => e && e.value === 2, target: 'stage2' },
            { guard: (_: any, e: any) => e && e.value === 3, target: 'stage3' },
            { guard: (_: any, e: any) => e && e.value === 4, target: 'stage4' },
            { guard: (_: any, e: any) => e && e.value === 5, target: 'stage5' },
            { guard: (_: any, e: any) => e && e.value === 6, target: 'stage6' },
            { guard: (_: any, e: any) => e && e.value === 7, target: 'stage7' },
            { guard: (_: any, e: any) => e && e.value === 8, target: 'stage8' }
          ],
        },
      },
    },
  });
}

/**
 * Type-safe wrapper to get the current stage number from a state value
 * @param stateValue The current state value from the machine
 * @returns The current stage number (1-8)
 */
export function getCurrentStageFromState(stateValue: string): number {
  const match = stateValue.match(/stage(\d)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 1; // Default to stage 1 if parsing fails
}
