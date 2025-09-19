/**
 * Prompt template for Stage 2: Technical Architecture & System Design
 * 
 * This prompt helps define the technical architecture, system design, and technology
 * stack that will be used to implement the MVP features defined in Stage 1.
 */

interface PreviousStageData {
  elevatorPitch?: string;
  problemStatement?: string;
  coreFeatures?: Array<{
    name: string;
    description: string;
    userStory: string;
    acceptanceCriteria: string[];
  }>;
  nonFunctionalRequirements?: {
    performance?: string;
    security?: string;
    scalability?: string;
    accessibility?: string;
  };
  [key: string]: any;
}

/**
 * Generates a prompt for the Technical Architecture stage
 * @param previousStageData Data from the MVP Definition stage
 * @param additionalRequirements Any additional technical requirements or preferences
 * @returns A formatted prompt string for the LLM
 */
export const stage2Prompt = (
  previousStageData: PreviousStageData,
  additionalRequirements: string
): string => {
  const features = previousStageData?.coreFeatures || [];
  const nonFunctionalRequirements = previousStageData?.nonFunctionalRequirements || {};
  
  return `
You are a senior solutions architect with expertise in designing scalable, maintainable software systems. Your task is to create a comprehensive technical architecture for the following MVP.

PREVIOUS MVP DEFINITION:
${JSON.stringify(previousStageData, null, 2)}

ADDITIONAL TECHNICAL REQUIREMENTS:
${additionalRequirements}

TASK:
Design a detailed technical architecture that maps specific technologies to each feature requirement, defines system components and their relationships, and addresses all non-functional requirements. Your architecture must be concrete and implementable, not theoretical.

REQUIRED SECTIONS:

1. TECHNOLOGY STACK MAPPING
For each feature, specify:
- Frontend technologies (frameworks, libraries, UI components)
- Backend technologies (languages, frameworks, APIs)
- Database technologies (type, schema considerations)
- Infrastructure components (servers, services, deployment)

Map each core feature to specific technologies, explaining why they're appropriate for implementing that feature.

2. SYSTEM ARCHITECTURE
Define the overall architecture pattern (e.g., microservices, monolith, serverless) and justify your choice.
Identify all major components and their responsibilities.
Explain how components interact and communicate.

3. SERVICE CONNECTIONS
Detail how different services and components connect and communicate.
Specify APIs, protocols, and data formats for each connection.
Address authentication and security between services.

4. TECHNICAL DEPENDENCIES
List all external dependencies, libraries, and third-party services.
Explain integration points and requirements for each.
Consider licensing, cost, and support implications.

5. SCALABILITY STRATEGIES
Address how the system will scale to handle increased load.
Include specific strategies for:
- CDN implementation for static assets
- Image optimization and compression
- Queue systems for asynchronous processing
- Database scaling (sharding, replication)
- Caching strategies at different levels

6. INFRASTRUCTURE REQUIREMENTS
Specify hosting environment (cloud provider, on-premises).
Detail server specifications, container orchestration.
Address CI/CD pipeline requirements.
Include monitoring, logging, and observability solutions.

7. THIRD-PARTY SERVICES
List all third-party services needed (authentication, payments, email, etc.).
Provide alternatives for each service.
Include pricing considerations and API documentation links.

8. SYSTEM DIAGRAM
Create an ASCII diagram showing the complete system architecture.
Include all components, services, and their connections.
Use clear labels and connection types.

9. SECURITY CONSIDERATIONS
Detail authentication and authorization mechanisms.
Address data encryption (at rest and in transit).
Include compliance requirements (GDPR, HIPAA, etc. if applicable).

10. DEPLOYMENT STRATEGY
Outline the deployment approach (blue-green, canary, etc.).
Specify environments (dev, staging, production).
Address backup and disaster recovery strategies.

11. CLARIFYING QUESTIONS
Generate 5-7 specific questions that would help refine this architecture further.

FORMAT:
Return your response as a JSON object with the following structure:
{
  "frontendStack": [
    {
      "name": "string",
      "description": "string",
      "alternatives": ["string"],
      "rationale": "string"
    }
  ],
  "backendStack": [
    {
      "name": "string",
      "description": "string",
      "alternatives": ["string"],
      "rationale": "string"
    }
  ],
  "database": [
    {
      "name": "string",
      "description": "string",
      "alternatives": ["string"],
      "rationale": "string"
    }
  ],
  "infrastructure": [
    {
      "name": "string",
      "description": "string",
      "alternatives": ["string"],
      "rationale": "string"
    }
  ],
  "featureTechMapping": [
    {
      "featureName": "string",
      "technologies": ["string"],
      "complexityLevel": "Low|Medium|High"
    }
  ],
  "systemDiagram": "ASCII diagram as string",
  "serviceConnections": [
    {
      "source": "string",
      "target": "string",
      "description": "string",
      "protocol": "string"
    }
  ],
  "technicalDependencies": ["string"],
  "scalabilityStrategies": [
    {
      "component": "string",
      "strategy": "string",
      "implementation": "string",
      "thresholds": "string"
    }
  ],
  "thirdPartyServices": [
    {
      "name": "string",
      "purpose": "string",
      "apiDocumentation": "string",
      "pricing": "string",
      "alternatives": ["string"]
    }
  ],
  "securityConsiderations": ["string"],
  "deploymentStrategy": "string",
  "devOpsRequirements": ["string"],
  "questions": ["string"],
  "raw": "${additionalRequirements.replace(/"/g, '\\"')}"
}

IMPORTANT GUIDELINES:
- Be specific about technology choices, not generic
- Ensure all features from the MVP have corresponding technology implementations
- Focus on practical, implementable solutions
- Consider scalability from day one, even for an MVP
- Ensure the architecture addresses all non-functional requirements
- Make the ASCII diagram clear and readable
- Provide concrete justifications for technology choices
`;
};

export default stage2Prompt;
