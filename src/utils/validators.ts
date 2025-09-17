/**
 * Validators for the Vibe Code Assistant
 * Provides validation rules for each stage's output to ensure
 * quality and completeness before acceptance.
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Helper to safely check if an array has minimum length
 * @param arr The array to check
 * @param minLength Minimum required length
 * @returns true if array exists and meets minimum length
 */
function hasMinLength(arr: any, minLength: number): boolean {
  return Array.isArray(arr) && arr.length >= minLength;
}

/**
 * Helper to check if a property exists and is non-empty
 * @param obj The object to check
 * @param propPath Dot-notation property path (e.g. "user.name")
 * @returns true if property exists and has value
 */
function hasProperty(obj: any, propPath: string): boolean {
  if (!obj) return false;
  
  const parts = propPath.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = current[part];
    if (current === undefined) return false;
  }
  
  // Check if the final value is "empty"
  if (current === null || current === undefined) return false;
  if (typeof current === 'string' && current.trim() === '') return false;
  if (Array.isArray(current) && current.length === 0) return false;
  
  return true;
}

/**
 * Helper to check if any of the properties exist
 * @param obj The object to check
 * @param propPaths Array of property paths to check
 * @returns true if at least one property exists
 */
function hasAnyProperty(obj: any, propPaths: string[]): boolean {
  return propPaths.some(path => hasProperty(obj, path));
}

/**
 * Validation rules for each stage
 */
export const STAGE_VALIDATORS = {
  stage1: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check MVP features (minimum 3)
      const featuresPath = hasProperty(output, 'mvp_features') ? 'mvp_features' : 
                          hasProperty(output, 'features') ? 'features' : '';
      
      if (!featuresPath) {
        issues.push("MVP features section is missing");
      } else if (!hasMinLength(output[featuresPath], 3)) {
        issues.push("MVP must have at least 3 core features");
      }
      
      // Check target audience
      if (!hasAnyProperty(output, [
        'target_audience.primary', 
        'target_audience.primary_users',
        'audience.primary',
        'audience.primary_users'
      ])) {
        issues.push("Primary target audience must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage2: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check technology stack
      if (!hasAnyProperty(output, [
        'technology_stack', 
        'tech_stack',
        'stack',
        'technologies'
      ])) {
        issues.push("Technology stack must be defined");
      }
      
      // Check components
      if (!hasAnyProperty(output, [
        'system_components',
        'components',
        'architecture.components'
      ])) {
        issues.push("System components must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage3: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check user journeys/flows
      if (!hasAnyProperty(output, [
        'user_journeys', 
        'user_flows',
        'flows',
        'journeys',
        'key_user_journeys'
      ])) {
        issues.push("User journeys or flows must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage4: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check color palette
      if (!hasAnyProperty(output, [
        'color_palette', 
        'colors',
        'palette'
      ])) {
        issues.push("Color palette must be defined");
      }
      
      // Check typography
      if (!hasAnyProperty(output, [
        'typography', 
        'fonts',
        'font_system'
      ])) {
        issues.push("Typography must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage5: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check API specifications
      if (!hasAnyProperty(output, [
        'api_specifications', 
        'apis',
        'endpoints',
        'api_endpoints'
      ])) {
        issues.push("API specifications must be defined");
      }
      
      // Check data models
      if (!hasAnyProperty(output, [
        'data_models', 
        'models',
        'schemas'
      ])) {
        issues.push("Data models must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage6: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check database schema
      if (!hasAnyProperty(output, [
        'database_schema', 
        'schema',
        'data_schema',
        'tables'
      ])) {
        issues.push("Database schema must be defined");
      }
      
      // Check data flows
      if (!hasAnyProperty(output, [
        'data_flows', 
        'data_flow_diagrams',
        'flows'
      ])) {
        issues.push("Data flows must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage7: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check tasks
      const tasksPath = hasProperty(output, 'tasks') ? 'tasks' : 
                       hasProperty(output, 'task_breakdown') ? 'task_breakdown' :
                       hasProperty(output, 'implementation_tasks') ? 'implementation_tasks' : '';
      
      if (!tasksPath) {
        issues.push("Tasks must be defined");
      } else if (!hasMinLength(output[tasksPath], 1)) {
        issues.push("At least one task must be defined");
      }
      
      // Check dependencies (might be nested in tasks)
      const hasDependencies = hasProperty(output, 'dependencies') || 
                             (tasksPath && output[tasksPath].some((t: any) => 
                               hasProperty(t, 'dependencies') || hasProperty(t, 'depends_on')));
      
      if (!hasDependencies) {
        issues.push("Task dependencies must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  },
  
  stage8: {
    validate: (output: any): ValidationResult => {
      const issues: string[] = [];
      
      // Handle null/undefined output
      if (!output) {
        return { valid: false, issues: ["Output is empty or invalid"] };
      }
      
      // Check executive summary
      if (!hasAnyProperty(output, [
        'executive_summary', 
        'summary',
        'overview.summary'
      ])) {
        issues.push("Executive summary must be defined");
      }
      
      // Check project overview
      if (!hasAnyProperty(output, [
        'project_overview', 
        'overview',
        'project.overview'
      ])) {
        issues.push("Project overview must be defined");
      }
      
      return { valid: issues.length === 0, issues };
    }
  }
};

/**
 * Validates output for a specific stage
 * @param stageId Stage number (1-8)
 * @param output The output to validate (already parsed JSON)
 * @returns Validation result with valid flag and issues
 */
export function validateStageOutput(stageId: number, output: any): ValidationResult {
  // Default validation result
  const defaultResult: ValidationResult = { 
    valid: true, 
    issues: [] 
  };
  
  // Handle null/undefined output
  if (!output) {
    return { valid: false, issues: ["Output is empty or invalid"] };
  }
  
  // Get stage validator
  const stageKey = `stage${stageId}` as keyof typeof STAGE_VALIDATORS;
  const validator = STAGE_VALIDATORS[stageKey];
  
  // If no validator for this stage, return default result
  if (!validator || !validator.validate) {
    return defaultResult;
  }
  
  // Run the stage-specific validator
  try {
    return validator.validate(output);
  } catch (error) {
    // If validation throws an error, return invalid with error message
    return { 
      valid: false, 
      issues: [`Validation error: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}
