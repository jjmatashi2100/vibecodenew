/**
 * Prompt templates for the 8-stage workflow
 * Each stage has an initial prompt and an iteration prompt for refinement
 */
import { PROMPT_COMPONENTS } from './promptUtils';
import { schemaForStage } from './schemas';

export const STAGE_PROMPTS = {
  stage1: {
    /**
     * Initial prompt for Stage 1: MVP Definition
     * @param concept The user's app concept
     * @param context Previous context data
     */
    initial: (concept: string, context: any): string => {
      return `You are a SaaS founder focused on problem-solving. Transform this concept into a comprehensive MVP plan.

Concept: ${concept}

Context Summary:
${context?.summary || ''}

Generate a detailed MVP specification including:

1. ELEVATOR PITCH (2-3 sentences)
2. PROBLEM STATEMENT (specific pain points)
3. TARGET AUDIENCE
   - Primary users (be specific)
   - Secondary users
   - Tertiary users
4. UNIQUE SELLING PROPOSITION
5. MVP FEATURES (5-7 core features only)
   For each feature include:
   - Name and description
   - User story (As a..., I want..., So that...)
   - Acceptance criteria
6. NON-FUNCTIONAL REQUIREMENTS
   - Performance needs
   - Security requirements
   - Scalability considerations
7. MONETIZATION STRATEGY
8. CRITICAL QUESTIONS
   - Generate 3-5 RELEVANT questions based on the specific context
   - Focus on areas that need clarification to improve the plan
   - If monetization is subscription-based, ask about retention
   - If data-heavy, ask about storage and performance

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(1)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 1: MVP Definition
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this MVP plan:

${current}

Based on the following questions and answers, refine the MVP plan:

${questionsAndAnswers}

Generate an improved, detailed MVP specification including:

1. ELEVATOR PITCH (2-3 sentences)
2. PROBLEM STATEMENT (specific pain points)
3. TARGET AUDIENCE
   - Primary users (be specific)
   - Secondary users
   - Tertiary users
4. UNIQUE SELLING PROPOSITION
5. MVP FEATURES (5-7 core features only)
   For each feature include:
   - Name and description
   - User story (As a..., I want..., So that...)
   - Acceptance criteria
6. NON-FUNCTIONAL REQUIREMENTS
   - Performance needs
   - Security requirements
   - Scalability considerations
7. MONETIZATION STRATEGY
8. CRITICAL QUESTIONS
   - Generate 3-5 RELEVANT questions based on the specific context
   - Focus on areas that need clarification to improve the plan

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(1)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 1: returns a strict JSON rubric & deltas
     * @param current Current MVP plan
     */
    evaluate: (current: string): string => `
You are a senior product analyst. Evaluate the MVP plan below.

Return STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<short name>", "pass": true|false, "weight": 5-20, "notes": "<why>" }
  ],
  "deltas": [
    { "target": "<section|feature>", "action": "add"|"edit"|"remove", "detail": "<improvement>" }
  ]
}

MVP PLAN:
${current}
`,

    /**
     * Optimizer prompt for Stage 1 – applies deltas and returns an improved spec.
     * @param current Current MVP content
     * @param deltas  Array of change instructions from evaluator
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are revising an MVP specification. Apply the deltas below to the current spec.

Current specification:
${current}

Deltas to apply (JSON):
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the improved specification, preserving the original structure (markdown/JSON). Do NOT add commentary.
`
  },

  stage2: {
    /**
     * Initial prompt for Stage 2: Technical Architecture
     * @param constraints User-specified technical constraints
     * @param context Previous context data including Stage 1 output
     */
    initial: (constraints: string, context: any): string => {
      return `You are a Senior Software Engineer designing the technical architecture.

Context Summary:
${context?.summary || ''}

${constraints ? `Additional constraints/preferences: ${constraints}` : ''}

First, analyze the requirements:
- What are the core data flows needed to support the MVP features?
- What are the likely performance bottlenecks based on the user base and feature set?
- What security requirements are implied by the data being handled?
- What integration points with external systems are needed?
- What scalability considerations should influence the architecture?

Based on this analysis, design a comprehensive technical architecture including:

1. SYSTEM COMPONENTS
   - Frontend components
   - Backend services
   - Data storage
   - External integrations

2. TECHNOLOGY STACK
   - Programming languages
   - Frameworks and libraries
   - Databases
   - APIs and protocols

3. DATA FLOW
   - User interactions
   - System processes
   - Data transformations
   - Integration points

4. DEPLOYMENT ARCHITECTURE
   - Infrastructure requirements
   - Hosting environment
   - Scalability approach
   - Security considerations

5. TECHNICAL DIAGRAMS
   - System architecture diagram (describe in detail)
   - Data model diagram (describe in detail)
   - API endpoints and interactions

6. TECHNICAL QUESTIONS
   - Generate 3-5 RELEVANT questions based on the specific architecture
   - Focus on technical trade-offs or constraints that need clarification
   - If performance is critical, ask about optimization strategies
   - If security is paramount, ask about compliance requirements

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(2)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 2: Technical Architecture
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this technical architecture:

${current}

Based on the following questions and answers, refine the technical architecture:

${questionsAndAnswers}

Generate an improved, comprehensive technical architecture including:

1. SYSTEM COMPONENTS
2. TECHNOLOGY STACK
3. DATA FLOW
4. DEPLOYMENT ARCHITECTURE
5. TECHNICAL DIAGRAMS
6. TECHNICAL QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific architecture
   - Focus on technical trade-offs or constraints that need clarification

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(2)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 2: assesses technical architecture
     * @param current Current architecture document
     */
    evaluate: (current: string): string => `
You are a principal architect. Critically evaluate the following technical architecture.

Respond with STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., scalability>", "pass": true|false, "weight": 5-20, "notes": "<why/what's missing>" }
  ],
  "deltas": [
    { "target": "<component/section>", "action": "add"|"edit"|"remove", "detail": "<fix>" }
  ]
}

TECHNICAL ARCHITECTURE:
${current}
`,

    /**
     * Optimizer prompt for Stage 2 – applies deltas to improve architecture.
     * @param current Current architecture
     * @param deltas  Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are refining a technical architecture document. Apply the provided deltas.

Current architecture:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the revised architecture document (markdown/JSON), no extra commentary.
`
  },

  stage3: {
    /**
     * Initial prompt for Stage 3: User Flow
     * @param constraints User-specified flow constraints
     * @param context Previous context data including Stage 1 and 2 outputs
     */
    initial: (constraints: string, context: any): string => {
      return `You are a UX Designer creating user flows for the application.

Context Summary:
${context?.summary || ''}

${constraints ? `Additional constraints/preferences: ${constraints}` : ''}

Design comprehensive user flows including:

1. USER PERSONAS (based on target audience)
2. KEY USER JOURNEYS
3. SCREEN FLOW DIAGRAMS (describe in detail)
4. INTERACTION PATTERNS
5. ERROR HANDLING FLOWS
6. QUESTIONS
   - Generate 3-5 RELEVANT questions about user flow trade-offs
   - If the app targets non-technical users, focus on UX/accessibility questions
   - If there are complex workflows, ask about simplification options
   - If there are multiple user types, ask about priority journeys

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(3)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 3: User Flow
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated these user flows:

${current}

Based on the following questions and answers, refine the user flows:

${questionsAndAnswers}

Generate improved user flows including:
1. USER PERSONAS
2. KEY USER JOURNEYS
3. SCREEN FLOW DIAGRAMS
4. INTERACTION PATTERNS
5. ERROR HANDLING FLOWS
6. QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific context

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(3)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 3: assesses user flows
     */
    evaluate: (current: string): string => `
You are a lead UX researcher. Critically evaluate the following USER FLOWS.

Respond with STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., completeness>", "pass": true|false, "weight": 5-20, "notes": "<why/what's missing>" }
  ],
  "deltas": [
    { "target": "<flow/section>", "action": "add"|"edit"|"remove", "detail": "<fix>" }
  ]
}

USER FLOWS:
${current}
`,

    /**
     * Optimizer prompt for Stage 3
     * @param current Current user flows
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are refining user flows. Apply the provided deltas.

Current user flows:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the revised user flows (markdown/JSON), no extra commentary.
`
  },

  stage4: {
    /**
     * Initial prompt for Stage 4: Style Guide
     * @param preferences User-specified style preferences
     * @param context Previous context data including Stages 1-3 outputs
     */
    initial: (preferences: string, context: any): string => {
      return `You are a UI Designer creating a style guide for the application.

Context Summary:
${context?.summary || ''}

${preferences ? `Style preferences: ${preferences}` : ''}

Create a comprehensive style guide including:

1. COLOR PALETTE (primary, secondary, accent, neutrals)
2. TYPOGRAPHY (fonts, sizes, weights, line heights)
3. COMPONENTS (buttons, inputs, cards, navigation, etc.)
4. ICONOGRAPHY
5. SPACING SYSTEM
6. RESPONSIVE DESIGN PRINCIPLES
7. ACCESSIBILITY GUIDELINES
8. QUESTIONS
   - Generate 3-5 RELEVANT questions about style choices
   - If accessibility is important, focus on compliance questions
   - If branding is important, ask about brand alignment
   - If multi-platform, ask about platform-specific adaptations

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(4)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 4: Style Guide
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this style guide:

${current}

Based on the following questions and answers, refine the style guide:

${questionsAndAnswers}

Generate an improved style guide including all essential sections:
1. COLOR PALETTE
2. TYPOGRAPHY
3. COMPONENTS
4. ICONOGRAPHY
5. SPACING SYSTEM
6. RESPONSIVE DESIGN PRINCIPLES
7. ACCESSIBILITY GUIDELINES
8. QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific context

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(4)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 4: assesses style guide
     */
    evaluate: (current: string): string => `
You are a senior UI designer. Evaluate the following STYLE GUIDE.

Return STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., accessibility>", "pass": true|false, "weight": 5-20, "notes": "<why>" }
  ],
  "deltas": [
    { "target": "<section>", "action": "add"|"edit"|"remove", "detail": "<improvement>" }
  ]
}

STYLE GUIDE:
${current}
`,

    /**
     * Optimizer prompt for Stage 4
     * @param current Current style guide
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are improving a style guide. Apply these deltas.

Current guide:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the updated style guide (markdown/JSON), no commentary.
`
  },

  stage5: {
    /**
     * Initial prompt for Stage 5: Technical Spec
     * @param requirements Additional technical requirements
     * @param context Previous context data including Stages 1-4 outputs
     */
    initial: (requirements: string, context: any): string => {
      return `You are a Technical Lead creating detailed specifications for the application.

Context Summary:
${context?.summary || ''}

${requirements ? `Additional requirements: ${requirements}` : ''}

Create a comprehensive technical specification including:

1. FUNCTIONAL REQUIREMENTS (detailed for each feature)
2. API SPECIFICATIONS (endpoints, methods, parameters, responses)
3. DATA MODELS (schemas, relationships, validation rules)
4. AUTHENTICATION & AUTHORIZATION
5. ERROR HANDLING STRATEGY
6. PERFORMANCE REQUIREMENTS
7. SECURITY CONSIDERATIONS
8. THIRD-PARTY INTEGRATIONS
9. QUESTIONS
   - Generate 3-5 RELEVANT technical questions that need clarification
   - If security is critical, focus on compliance/audit questions
   - If performance is key, ask about optimization strategies
   - If integration-heavy, ask about API versioning and fallbacks

Respond with a SINGLE top-level JSON object only. Do NOT include any markdown, code fences, or prose. If narrative is required, embed it inside JSON fields.

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(5)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 5: Technical Spec
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this technical specification:

${current}

Based on the following questions and answers, refine the technical specification:

${questionsAndAnswers}

Generate an improved technical specification including all essential sections:
1. FUNCTIONAL REQUIREMENTS
2. API SPECIFICATIONS
3. DATA MODELS
4. AUTHENTICATION & AUTHORIZATION
5. ERROR HANDLING STRATEGY
6. PERFORMANCE REQUIREMENTS
7. SECURITY CONSIDERATIONS
8. THIRD-PARTY INTEGRATIONS
9. QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific context

Respond with a SINGLE top-level JSON object only. Do NOT include any markdown, code fences, or prose. If narrative is required, embed it inside JSON fields.

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(5)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 5: assesses technical specification
     */
    evaluate: (current: string): string => `
You are a chief engineer. Evaluate the following TECHNICAL SPECIFICATION.

Respond with STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., API completeness>", "pass": true|false, "weight": 5-20, "notes": "<detail>" }
  ],
  "deltas": [
    { "target": "<section>", "action": "add"|"edit"|"remove", "detail": "<fix>" }
  ]
}

TECHNICAL SPECIFICATION:
${current}
`,

    /**
     * Optimizer prompt for Stage 5
     * @param current Current technical specification
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are refining a technical specification. Apply the following deltas.

Current spec:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the revised specification (markdown/JSON), no commentary.
`
  },

  stage6: {
    /**
     * Initial prompt for Stage 6: Data Architecture
     * @param constraints Data architecture constraints
     * @param context Previous context data including Stages 1-5 outputs
     */
    initial: (constraints: string, context: any): string => {
      return `You are a Data Architect designing the data architecture for the application.

Context Summary:
${context?.summary || ''}

${constraints ? `Data constraints: ${constraints}` : ''}

Create a comprehensive data architecture including:

1. DATABASE SCHEMA (tables, fields, relationships)
2. DATA FLOW DIAGRAMS
3. DATA STORAGE SOLUTIONS
4. DATA ACCESS PATTERNS
5. CACHING STRATEGY
6. DATA MIGRATION PLAN
7. BACKUP & RECOVERY STRATEGY
8. DATA SECURITY & COMPLIANCE
9. QUESTIONS
   - Generate 3-5 RELEVANT questions about data architecture decisions
   - If data-heavy, ask about storage costs and query optimization
   - If sensitive data is involved, ask about compliance requirements
   - If high-availability is needed, ask about replication strategies

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(6)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 6: Data Architecture
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this data architecture:

${current}

Based on the following questions and answers, refine the data architecture:

${questionsAndAnswers}

Generate an improved data architecture including all essential sections:
1. DATABASE SCHEMA
2. DATA FLOW DIAGRAMS
3. DATA STORAGE SOLUTIONS
4. DATA ACCESS PATTERNS
5. CACHING STRATEGY
6. DATA MIGRATION PLAN
7. BACKUP & RECOVERY STRATEGY
8. DATA SECURITY & COMPLIANCE
9. QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific context

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(6)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 6: assesses data architecture
     */
    evaluate: (current: string): string => `
You are a senior data architect. Evaluate the following DATA ARCHITECTURE.

Return STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., normalization>", "pass": true|false, "weight": 5-20, "notes": "<detail>" }
  ],
  "deltas": [
    { "target": "<table/flow>", "action": "add"|"edit"|"remove", "detail": "<improvement>" }
  ]
}

DATA ARCHITECTURE:
${current}
`,

    /**
     * Optimizer prompt for Stage 6
     * @param current Current data architecture
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are improving a data architecture. Apply the provided deltas.

Current design:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the updated data architecture (markdown/JSON), no commentary.
`
  },

  stage7: {
    /**
     * Initial prompt for Stage 7: Task Planning
     * @param constraints Task planning constraints
     * @param context Previous context data including Stages 1-6 outputs
     */
    initial: (constraints: string, context: any): string => {
      return `You are a Project Manager creating a task breakdown for implementing this application.

Context Summary:
${context?.summary || ''}

${constraints ? `Planning constraints: ${constraints}` : ''}

Create a comprehensive task plan including:

1. TASK BREAKDOWN (organized by feature/component)
2. DEPENDENCIES BETWEEN TASKS
3. EFFORT ESTIMATION (story points or time)
4. PRIORITY LEVELS
5. MILESTONES & DELIVERABLES
6. RESOURCE REQUIREMENTS
7. RISK ASSESSMENT
8. QUESTIONS
   - Generate 3-5 RELEVANT questions about implementation planning
   - If timeline is tight, ask about MVP scope reduction options
   - If resources are limited, ask about prioritization strategies
   - If complex dependencies exist, ask about critical path management

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(7)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 7: Task Planning
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this task plan:

${current}

Based on the following questions and answers, refine the task plan:

${questionsAndAnswers}

Generate an improved task plan including all essential sections:
1. TASK BREAKDOWN
2. DEPENDENCIES BETWEEN TASKS
3. EFFORT ESTIMATION
4. PRIORITY LEVELS
5. MILESTONES & DELIVERABLES
6. RESOURCE REQUIREMENTS
7. RISK ASSESSMENT
8. QUESTIONS (if any remain)
   - Generate 3-5 RELEVANT questions based on the specific context

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(7)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 7: assesses task plan
     */
    evaluate: (current: string): string => `
You are a programme manager. Evaluate the following TASK PLAN.

Provide STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., dependency logic>", "pass": true|false, "weight": 5-20, "notes": "<why>" }
  ],
  "deltas": [
    { "target": "<task/phase>", "action": "add"|"edit"|"remove", "detail": "<improve>" }
  ]
}

TASK PLAN:
${current}
`,

    /**
     * Optimizer prompt for Stage 7
     * @param current Current task plan
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are refining an implementation task plan. Apply these deltas.

Current plan:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the updated task plan (markdown/JSON), no commentary.
`
  },

  stage8: {
    /**
     * Initial prompt for Stage 8: Export
     * @param format Export format preferences
     * @param context Previous context data including Stages 1-7 outputs
     */
    initial: (format: string, context: any): string => {
      return `You are a Technical Writer creating a comprehensive project specification document.

Context Summary:
${context?.summary || ''}

${format ? `Export format preferences: ${format}` : ''}

Create a complete project specification including:

1. EXECUTIVE SUMMARY
2. PROJECT OVERVIEW
3. MVP DEFINITION
4. TECHNICAL ARCHITECTURE
5. USER FLOWS
6. STYLE GUIDE
7. TECHNICAL SPECIFICATIONS
8. DATA ARCHITECTURE
9. IMPLEMENTATION PLAN
10. APPENDICES (diagrams, references)

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(8)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    },

    /**
     * Iteration prompt for Stage 8: Export
     * @param current Current output content
     * @param questions Questions generated from the initial output
     * @param answers User's answers to the questions
     */
    iteration: (current: string, questions: any[], answers: any[]): string => {
      const questionsAndAnswers = questions.map((q, i) => {
        const question = typeof q === 'string' ? q : q.text;
        return `Question: ${question}\nAnswer: ${answers[i] || 'No answer provided'}`;
      }).join('\n\n');

      return `You previously generated this project specification:

${current}

Based on the following questions and answers, refine the project specification:

${questionsAndAnswers}

Generate an improved project specification including all essential sections:
1. EXECUTIVE SUMMARY
2. PROJECT OVERVIEW
3. MVP DEFINITION
4. TECHNICAL ARCHITECTURE
5. USER FLOWS
6. STYLE GUIDE
7. TECHNICAL SPECIFICATIONS
8. DATA ARCHITECTURE
9. IMPLEMENTATION PLAN
10. APPENDICES

${PROMPT_COMPONENTS.jsonInstruction}
JSON SCHEMA (must match exactly):
${schemaForStage(8)}
${PROMPT_COMPONENTS.contextWindow(1500)}`;
    }

    ,

    /**
     * Evaluator prompt for Stage 8: assesses the final export document
     */
    evaluate: (current: string): string => `
You are a senior technical writer and editor. Critically evaluate the following PROJECT SPECIFICATION.

Return STRICT JSON ONLY — **no prose outside the JSON**.  
Schema (sum of \`weight\` fields MUST equal **100**; adjust the last item if necessary):
{
  "raw_score": 0-100,
  "summary": "<one-sentence verdict>",
  "checklist": [
    { "criterion": "<e.g., completeness>", "pass": true|false, "weight": 5-20, "notes": "<why/what's missing>" }
  ],
  "deltas": [
    { "target": "<section>", "action": "add"|"edit"|"remove", "detail": "<improvement>" }
  ]
}

PROJECT SPECIFICATION:
${current}
`,

    /**
     * Optimizer prompt for Stage 8 – applies deltas to improve the export document
     * @param current Current project specification
     * @param deltas Array of change instructions
     * @param score Optional evaluation score
     */
    optimize: (current: string, deltas: any[], score?: number): string => `
You are refining a comprehensive project specification document. Apply the provided deltas.

Current document:
${current}

Deltas:
${JSON.stringify(deltas, null, 2)}

Priority: ${score !== undefined && score < 70 ? 'Focus on CRITICAL deltas first' : 'Apply refinement and polish'}

Return ONLY the improved project specification (markdown/JSON) with the same structure, no additional commentary.
`
  }
};
