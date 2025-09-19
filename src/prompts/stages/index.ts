/**
 * Index file for all stage prompts
 * 
 * This file exports all stage prompts for easy import elsewhere in the application.
 * Each stage represents a step in the Vibe Code System methodology.
 */

import stage1Prompt from './stage1';
import stage2Prompt from './stage2';
import stage3Prompt from './stage3';
import stage4Prompt from './stage4';
import stage5Prompt from './stage5';
import stage6Prompt from './stage6';
import stage7Prompt from './stage7';
import stage8Prompt from './stage8';

// Export individual stage prompts
export {
  stage1Prompt, // MVP Definition
  stage2Prompt, // Technical Architecture
  stage3Prompt, // User Flow Mapping
  stage4Prompt, // Style Guides and State Designs
  stage5Prompt, // Comprehensive Technical Specification
  stage6Prompt, // Data Architecture & Infrastructure Planning
  stage7Prompt, // Detailed Task-by-Task Plan
  stage8Prompt  // Export & Handoff
};

// Export all stage prompts as a collection
export const stagePrompts = {
  stage1: stage1Prompt,
  stage2: stage2Prompt,
  stage3: stage3Prompt,
  stage4: stage4Prompt,
  stage5: stage5Prompt,
  stage6: stage6Prompt,
  stage7: stage7Prompt,
  stage8: stage8Prompt
};

// Export stage names for reference
export const stageNames = {
  stage1: 'MVP Definition',
  stage2: 'Technical Architecture',
  stage3: 'User Flow Mapping',
  stage4: 'Style Guides and State Designs',
  stage5: 'Comprehensive Technical Specification',
  stage6: 'Data Architecture & Infrastructure Planning',
  stage7: 'Detailed Task-by-Task Plan',
  stage8: 'Export & Handoff'
};

export default stagePrompts;
