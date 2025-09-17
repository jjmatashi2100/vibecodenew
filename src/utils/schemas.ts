/**
 * JSON Schema definitions for stage outputs
 * Provides schemas for validating and enforcing structured output
 */

/**
 * Returns a JSON schema string for the specified stage
 * @param stageId Stage number (1-8)
 * @returns JSON schema string for the stage
 */
export function schemaForStage(stageId: number): string {
  const schema = STAGE_SCHEMAS[`stage${stageId}`] || STAGE_SCHEMAS.default;
  return JSON.stringify(schema, null, 2);
}

/**
 * JSON Schema definitions for each stage
 */
// Explicit Record typing so `schemaForStage` indexing is type-safe
const STAGE_SCHEMAS: Record<string, any> = {
  /**
   * Stage 1: MVP Definition
   */
  stage1: {
    type: "object",
    properties: {
      elevator_pitch: { type: "string" },
      problem_statement: {
        oneOf: [
          { type: "string" },
          { 
            type: "object",
            properties: {
              pain_points: { 
                type: "array", 
                items: { type: "string" } 
              }
            }
          }
        ]
      },
      target_audience: {
        type: "object",
        properties: {
          primary: { type: ["string", "array"] },
          secondary: { type: ["string", "array"] },
          tertiary: { type: ["string", "array"] }
        }
      },
      unique_selling_proposition: { type: "string" },
      mvp_features: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            user_story: { type: "string" },
            acceptance_criteria: { 
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } }
              ]
            }
          }
        }
      },
      non_functional_requirements: {
        type: "object",
        properties: {
          performance: { type: ["string", "array", "object"] },
          security: { type: ["string", "array", "object"] },
          scalability: { type: ["string", "array", "object"] }
        }
      },
      monetization_strategy: { type: ["string", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["elevator_pitch", "mvp_features"]
  },

  /**
   * Stage 2: Technical Architecture
   */
  stage2: {
    type: "object",
    properties: {
      system_components: {
        oneOf: [
          { type: "string" },
          { 
            type: "object",
            properties: {
              frontend: { type: ["string", "array", "object"] },
              backend: { type: ["string", "array", "object"] },
              data_storage: { type: ["string", "array", "object"] },
              integrations: { type: ["string", "array", "object"] }
            }
          }
        ]
      },
      technology_stack: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
          { 
            type: "object",
            properties: {
              languages: { type: ["string", "array"] },
              frameworks: { type: ["string", "array"] },
              databases: { type: ["string", "array"] },
              apis: { type: ["string", "array"] }
            }
          }
        ]
      },
      data_flow: { type: ["string", "array", "object"] },
      deployment_architecture: { type: ["string", "array", "object"] },
      technical_diagrams: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["technology_stack"]
  },

  /**
   * Stage 3: User Flow
   */
  stage3: {
    type: "object",
    properties: {
      user_personas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            goals: { type: ["string", "array"] },
            pain_points: { type: ["string", "array"] }
          }
        }
      },
      key_user_journeys: {
        oneOf: [
          { type: "array", items: { type: ["string", "object"] } },
          { type: "object" }
        ]
      },
      screen_flow_diagrams: { type: ["string", "array", "object"] },
      interaction_patterns: { type: ["string", "array", "object"] },
      error_handling_flows: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["key_user_journeys"]
  },

  /**
   * Stage 4: Style Guide
   */
  stage4: {
    type: "object",
    properties: {
      color_palette: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: ["string", "object"] } },
          { 
            type: "object",
            properties: {
              primary: { type: ["string", "array", "object"] },
              secondary: { type: ["string", "array", "object"] },
              accent: { type: ["string", "array", "object"] },
              neutrals: { type: ["string", "array", "object"] }
            }
          }
        ]
      },
      typography: {
        oneOf: [
          { type: "string" },
          { 
            type: "object",
            properties: {
              fonts: { type: ["string", "array", "object"] },
              sizes: { type: ["string", "array", "object"] },
              weights: { type: ["string", "array", "object"] }
            }
          }
        ]
      },
      components: { type: ["string", "array", "object"] },
      iconography: { type: ["string", "array", "object"] },
      spacing_system: { type: ["string", "array", "object"] },
      responsive_design: { type: ["string", "array", "object"] },
      accessibility_guidelines: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["color_palette", "typography"]
  },

  /**
   * Stage 5: Technical Spec
   */
  stage5: {
    type: "object",
    properties: {
      functional_requirements: { type: ["string", "array", "object"] },
      api_specifications: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: ["string", "object"] } },
          { 
            type: "object",
            properties: {
              endpoints: { type: ["string", "array", "object"] }
            }
          }
        ]
      },
      data_models: { type: ["string", "array", "object"] },
      authentication: { type: ["string", "array", "object"] },
      authorization: { type: ["string", "array", "object"] },
      error_handling: { type: ["string", "array", "object"] },
      performance_requirements: { type: ["string", "array", "object"] },
      security_considerations: { type: ["string", "array", "object"] },
      third_party_integrations: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["api_specifications", "data_models"]
  },

  /**
   * Stage 6: Data Architecture
   */
  stage6: {
    type: "object",
    properties: {
      database_schema: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: ["string", "object"] } },
          { 
            type: "object",
            properties: {
              tables: { type: ["string", "array", "object"] },
              relationships: { type: ["string", "array", "object"] }
            }
          }
        ]
      },
      data_flow_diagrams: { type: ["string", "array", "object"] },
      data_storage_solutions: { type: ["string", "array", "object"] },
      data_access_patterns: { type: ["string", "array", "object"] },
      caching_strategy: { type: ["string", "array", "object"] },
      data_migration_plan: { type: ["string", "array", "object"] },
      backup_recovery: { type: ["string", "array", "object"] },
      data_security: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["database_schema"]
  },

  /**
   * Stage 7: Task Planning
   */
  stage7: {
    type: "object",
    properties: {
      task_breakdown: {
        oneOf: [
          { type: "string" },
          { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                effort: { type: ["string", "number"] },
                priority: { type: "string" },
                dependencies: { type: ["string", "array"] }
              }
            } 
          }
        ]
      },
      dependencies: { type: ["string", "array", "object"] },
      effort_estimation: { type: ["string", "array", "object"] },
      priority_levels: { type: ["string", "array", "object"] },
      milestones: { type: ["string", "array", "object"] },
      resource_requirements: { type: ["string", "array", "object"] },
      risk_assessment: { type: ["string", "array", "object"] },
      questions: {
        type: "array",
        items: { 
          oneOf: [
            { type: "string" },
            { 
              type: "object",
              properties: {
                text: { type: "string" }
              }
            }
          ]
        }
      }
    },
    required: ["task_breakdown"]
  },

  /**
   * Stage 8: Export
   */
  stage8: {
    type: "object",
    properties: {
      executive_summary: { type: "string" },
      project_overview: { type: ["string", "object"] },
      mvp_definition: { type: ["string", "object"] },
      technical_architecture: { type: ["string", "object"] },
      user_flows: { type: ["string", "object"] },
      style_guide: { type: ["string", "object"] },
      technical_specifications: { type: ["string", "object"] },
      data_architecture: { type: ["string", "object"] },
      implementation_plan: { type: ["string", "object"] },
      appendices: { type: ["string", "array", "object"] }
    },
    required: ["executive_summary", "project_overview"]
  },

  /**
   * Default schema (fallback)
   */
  default: {
    type: "object",
    properties: {
      content: { type: ["string", "object", "array"] }
    }
  }
};
