/**
 * Prompt utilities for the Vibe Code Assistant
 * Provides reusable prompt components and model-specific adaptations
 */

/**
 * Reusable prompt components to maintain consistency across templates
 */
export const PROMPT_COMPONENTS = {
  /**
   * Standard instruction for ensuring JSON-only responses
   */
  jsonInstruction: "Return STRICT JSON ONLY — no prose, no markdown backticks, no explanations outside the JSON.",
  
  /**
   * Generates a schema instruction with specified criteria count
   * @param criteriaCount Number of criteria in the evaluation
   * @returns Formatted instruction string
   */
  scoreSchema: (criteriaCount: number): string => 
    `Schema with ${criteriaCount} criteria (weights MUST sum to 100; adjust the last item if necessary)`,
  
  /**
   * Generates a token limit instruction
   * @param maxTokens Maximum tokens for the response
   * @returns Formatted instruction string
   */
  contextWindow: (maxTokens: number): string => 
    `Keep your response under ${maxTokens} tokens to ensure complete processing.`,
  
  /**
   * Instruction for continuation scenarios to avoid repetition
   */
  continuePolicy: "Continue exactly where you left off. DO NOT repeat any content already generated. DO NOT start with explanations or apologies."
};

/**
 * Model families and their specific prefixes
 */
const MODEL_ADAPTATIONS: Record<string, { prefix: string, style?: string }> = {
  'gpt': { 
    prefix: 'You are an expert software architect with deep experience in product development.',
    style: 'detailed'
  },
  'claude': { 
    prefix: 'As an experienced product development specialist, your task is to:',
    style: 'structured'
  },
  'llama': { 
    prefix: 'Task: Act as a product development expert to:',
    style: 'concise'
  },
  'mistral': { 
    prefix: 'You are a product development consultant specializing in software architecture.',
    style: 'balanced'
  },
  'default': { 
    prefix: 'You are a software development expert. Your task:',
    style: 'standard'
  }
};

/**
 * Adapts a prompt based on the model being used
 * @param basePrompt The original prompt template
 * @param modelId Optional model identifier to determine adaptation
 * @returns The adapted prompt with model-specific prefix
 */
export function adaptPromptForModel(basePrompt: string, modelId?: string): string {
  if (!modelId) {
    return `${MODEL_ADAPTATIONS.default.prefix}\n\n${basePrompt}`;
  }
  
  // Convert to lowercase for case-insensitive matching
  const modelIdLower = modelId.toLowerCase();
  
  // Find the matching model family
  const matchingFamily = Object.keys(MODEL_ADAPTATIONS).find(
    family => modelIdLower.includes(family)
  ) || 'default';
  
  const adaptation = MODEL_ADAPTATIONS[matchingFamily];
  
  return `${adaptation.prefix}\n\n${basePrompt}`;
}

/**
 * Parses JSON from LLM output, handling common formats
 * @param text The text potentially containing JSON
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseJsonFromLLM(text: string): any {
  if (!text) return null;
  
  try {
    // Try direct JSON parse first
    return JSON.parse(text);
  } catch (e) {
    // Look for JSON in markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (e) {
        // Failed to parse JSON from code block
      }
    }
    
    // Look for anything that looks like a JSON object
    const possibleJsonMatch = text.match(/(\{[\s\S]*\})/);
    if (possibleJsonMatch && possibleJsonMatch[1]) {
      try {
        return JSON.parse(possibleJsonMatch[1]);
      } catch (e) {
        // Failed to parse JSON from object-like text
      }
    }
  }
  
  return null;
}
