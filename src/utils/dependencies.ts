/**
 * Stage dependencies and context management for the Vibe Code Assistant
 * Handles which stages depend on which previous stages and provides utilities
 * for filtering and summarizing context.
 */

/**
 * Maps each stage to its required predecessor stages
 * 'all' is a special token meaning all previous stages
 */
export const STAGE_DEPENDENCIES = {
  stage1: [],
  stage2: ['stage1'],
  stage3: ['stage1', 'stage2'],
  stage4: ['stage1', 'stage3'],
  stage5: ['stage1', 'stage2', 'stage3'],
  stage6: ['stage2', 'stage5'],
  stage7: ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'],
  stage8: ['all']
};

/**
 * Stage titles for reference and display
 */
const STAGE_TITLES = [
  'MVP Definition',
  'Technical Architecture',
  'User Flow',
  'Style Guide',
  'Technical Spec',
  'Data Architecture',
  'Task Planning',
  'Export'
];

/**
 * Returns the title for a given stage ID
 * @param stageId Stage number (1-8)
 * @returns The title string for the stage
 */
export function stageTitle(stageId: number): string {
  const index = Math.max(0, Math.min(stageId - 1, STAGE_TITLES.length - 1));
  return STAGE_TITLES[index];
}

/**
 * Returns only the required context stages for the given stageId
 * @param stageId Stage number (1-8)
 * @param previousStages Object containing all previous stage outputs
 * @returns Filtered object with only required stage outputs
 */
export function getRequiredContext(stageId: number, previousStages: any): any {
  if (!previousStages) return {};
  
  const stageKey = `stage${stageId}`;
  // Cast to string[] so TypeScript knows we can call .includes and iterate safely
  const dependencies = (STAGE_DEPENDENCIES as any)[stageKey] as string[];
  
  // If no dependencies or invalid stage, return empty object
  if (!dependencies) return {};
  
  // Special case: 'all' means include all previous stages
  if (dependencies.includes('all')) {
    return { ...previousStages };
  }
  
  // Filter to only include required dependencies
  return dependencies.reduce((filtered, depKey) => {
    if (previousStages[depKey]) {
      filtered[depKey] = previousStages[depKey];
    }
    return filtered;
  }, {} as Record<string, any>);
}

/**
 * Creates a compact human-readable summary of the context
 * @param previous Object containing stage outputs
 * @param maxPerStageChars Maximum characters to include per stage
 * @returns Formatted string summary
 */
export function summarizeContext(previous: any, maxPerStageChars = 400): string {
  if (!previous) return "No previous context available.";
  
  const summaries = Object.entries(previous).map(([key, value]) => {
    // Extract stage number from key (e.g., "stage1" -> 1)
    const stageId = parseInt(key.replace('stage', ''), 10);
    if (isNaN(stageId)) return '';
    
    const title = stageTitle(stageId);
    let content = '';
    
    try {
      // If value is already a string, use it; otherwise stringify
      const stringValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value, null, 2);
      
      // Truncate to maxPerStageChars and add ellipsis if needed
      content = stringValue.length > maxPerStageChars
        ? `${stringValue.substring(0, maxPerStageChars)}...`
        : stringValue;
    } catch (e) {
      content = "[Error: Could not stringify content]";
    }
    
    return `## ${title} (Stage ${stageId}):\n${content}\n`;
  }).filter(Boolean).join('\n');
  
  return summaries || "No previous context available.";
}
