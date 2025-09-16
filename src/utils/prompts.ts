/**
 * Prompt templates for the 8-stage workflow
 * Each stage has an initial prompt and an iteration prompt for refinement
 */

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

Previous Context: ${JSON.stringify(context)}

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
8. CRITICAL QUESTIONS (5 questions to clarify and improve this plan)

Format as structured JSON with clear sections.`;
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
8. CRITICAL QUESTIONS (5 questions to clarify and improve this plan)

Format as structured JSON with clear sections.`;
    }
  },

  stage2: {
    /**
     * Initial prompt for Stage 2: Technical Architecture
     * @param constraints User-specified technical constraints
     * @param context Previous context data including Stage 1 output
     */
    initial: (constraints: string, context: any): string => {
      const mvpData = context.previousStages?.stage1 || {};
      
      return `You are a Senior Software Engineer designing the technical architecture.

Based on the MVP definition:
${JSON.stringify(mvpData, null, 2)}

${constraints ? `Additional constraints/preferences: ${constraints}` : ''}

Design a comprehensive technical architecture including:

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
   - List 3-5 questions about technical trade-offs or constraints that need clarification

Format as structured JSON with clear sections.`;
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

Format as structured JSON with clear sections.`;
    }
  },

  stage3: {
    /**
     * Initial prompt for Stage 3: User Flow
     * @param constraints User-specified flow constraints
     * @param context Previous context data including Stage 1 and 2 outputs
     */
    initial: (constraints: string, context: any): string => {
      const mvpData = context.previousStages?.stage1 || {};
      const archData = context.previousStages?.stage2 || {};
      
      return `You are a UX Designer creating user flows for the application.

Based on the MVP definition and technical architecture:
${JSON.stringify({ mvp: mvpData, architecture: archData }, null, 2)}

${constraints ? `Additional constraints/preferences: ${constraints}` : ''}

Design comprehensive user flows including:

1. USER PERSONAS (based on target audience)
2. KEY USER JOURNEYS
3. SCREEN FLOW DIAGRAMS (describe in detail)
4. INTERACTION PATTERNS
5. ERROR HANDLING FLOWS
6. QUESTIONS (3-5 questions about user flow trade-offs)

Format as structured JSON with clear sections.`;
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

Generate improved user flows in structured JSON format.`;
    }
  },

  stage4: {
    /**
     * Initial prompt for Stage 4: Style Guide
     * @param preferences User-specified style preferences
     * @param context Previous context data including Stages 1-3 outputs
     */
    initial: (preferences: string, context: any): string => {
      return `You are a UI Designer creating a style guide for the application.

Based on the previous stages:
${JSON.stringify(context.previousStages, null, 2)}

${preferences ? `Style preferences: ${preferences}` : ''}

Create a comprehensive style guide including:

1. COLOR PALETTE (primary, secondary, accent, neutrals)
2. TYPOGRAPHY (fonts, sizes, weights, line heights)
3. COMPONENTS (buttons, inputs, cards, navigation, etc.)
4. ICONOGRAPHY
5. SPACING SYSTEM
6. RESPONSIVE DESIGN PRINCIPLES
7. ACCESSIBILITY GUIDELINES
8. QUESTIONS (3-5 questions about style choices)

Format as structured JSON with clear sections.`;
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

Generate an improved style guide in structured JSON format.`;
    }
  },

  stage5: {
    /**
     * Initial prompt for Stage 5: Technical Spec
     * @param requirements Additional technical requirements
     * @param context Previous context data including Stages 1-4 outputs
     */
    initial: (requirements: string, context: any): string => {
      return `You are a Technical Lead creating detailed specifications for the application.

Based on the previous stages:
${JSON.stringify(context.previousStages, null, 2)}

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
9. QUESTIONS (3-5 technical questions that need clarification)

Format as structured JSON with clear sections.`;
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

Generate an improved technical specification in structured JSON format.`;
    }
  },

  stage6: {
    /**
     * Initial prompt for Stage 6: Data Architecture
     * @param constraints Data architecture constraints
     * @param context Previous context data including Stages 1-5 outputs
     */
    initial: (constraints: string, context: any): string => {
      return `You are a Data Architect designing the data architecture for the application.

Based on the previous stages:
${JSON.stringify(context.previousStages, null, 2)}

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
9. QUESTIONS (3-5 questions about data architecture decisions)

Format as structured JSON with clear sections.`;
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

Generate an improved data architecture in structured JSON format.`;
    }
  },

  stage7: {
    /**
     * Initial prompt for Stage 7: Task Planning
     * @param constraints Task planning constraints
     * @param context Previous context data including Stages 1-6 outputs
     */
    initial: (constraints: string, context: any): string => {
      return `You are a Project Manager creating a task breakdown for implementing this application.

Based on the previous stages:
${JSON.stringify(context.previousStages, null, 2)}

${constraints ? `Planning constraints: ${constraints}` : ''}

Create a comprehensive task plan including:

1. TASK BREAKDOWN (organized by feature/component)
2. DEPENDENCIES BETWEEN TASKS
3. EFFORT ESTIMATION (story points or time)
4. PRIORITY LEVELS
5. MILESTONES & DELIVERABLES
6. RESOURCE REQUIREMENTS
7. RISK ASSESSMENT
8. QUESTIONS (3-5 questions about implementation planning)

Format as structured JSON with clear sections.`;
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

Generate an improved task plan in structured JSON format.`;
    }
  },

  stage8: {
    /**
     * Initial prompt for Stage 8: Export
     * @param format Export format preferences
     * @param context Previous context data including Stages 1-7 outputs
     */
    initial: (format: string, context: any): string => {
      return `You are a Technical Writer creating a comprehensive project specification document.

Based on all previous stages:
${JSON.stringify(context.previousStages, null, 2)}

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

Format as structured JSON that can be converted to ${format || 'various formats'}.`;
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

Generate an improved project specification in structured JSON format.`;
    }
  }
};
