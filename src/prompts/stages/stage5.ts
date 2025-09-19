/**
 * Prompt template for Stage 5: Comprehensive Technical Specification
 * 
 * This prompt helps create detailed technical specifications that can be
 * used directly for implementation, covering architecture, data models,
 * APIs, security, and deployment.
 */

interface PreviousStageData {
  stage1?: any; // MVP Definition
  stage2?: any; // Technical Architecture
  stage3?: any; // User Flow Mapping
  stage4?: any; // Style Guides and State Designs
}

/**
 * Generates a prompt for the Comprehensive Technical Specification stage
 * @param previousStages Data from previous stages
 * @param technicalRequirements Any specific technical requirements or constraints
 * @returns A formatted prompt string for the LLM
 */
export const stage5Prompt = (
  previousStages: PreviousStageData,
  technicalRequirements: string
): string => {
  return `
<goal>
You are a Senior Software Architect with extensive experience in designing and implementing complex software systems. Your job is to create a comprehensive technical specification document that will serve as direct input for planning and code generation. The specification must be precise, structured, and provide actionable implementation guidance covering all aspects of the system from architecture to deployment.

Using the information from previous stages (MVP definition, technical architecture, user flows, and design system), you will create a detailed technical blueprint that developers can follow to build the application. Your specification should be thorough enough that developers can start coding immediately with minimal ambiguity.

Each time the user responds back to you with feedback or answers to your questions, you must integrate their responses into the overall specification, and then repeat back the entire updated technical specification that incorporates the clarifications.
</goal>

<format>
# **[Application Name] Technical Specification**

## **1. Executive Summary**

[Brief overview of the application, its purpose, and key technical decisions]

### **Key Technical Decisions**

* **Frontend**: [Technology choices with versions]
* **Backend**: [Technology choices with versions]
* **Database**: [Technology choices with versions]
* **Authentication**: [Technology choices with versions]
* **Deployment**: [Technology choices with versions]

### **High-level Architecture**

[Mermaid diagram of system architecture]

## **2. System Architecture**

### **2.1 Architecture Overview**

[Detailed description of the architecture, including patterns and principles]

**Frontend Architecture**

* [Key frontend architectural components]
* [State management approach]
* [Rendering strategy]
* [Performance considerations]

**Backend Architecture**

* [Key backend architectural components]
* [API design principles]
* [Authentication flow]
* [Error handling strategy]

**Data Flow**

[Step-by-step description of how data flows through the system]

### **2.2 Technology Stack**

**Frontend Technologies**

* **Framework**: [Framework name and version]
* **UI Library**: [Library name and version]
* **State Management**: [Library name and version]
* **Data Fetching**: [Library name and version]
* **Styling**: [Approach and libraries]
* **Animation**: [Library name and version]
* **Form Handling**: [Library name and version]
* **Date Handling**: [Library name and version]

**Backend Technologies**

* **Runtime**: [Runtime name and version]
* **API Layer**: [Technology choice]
* **ORM**: [Library name and version]
* **Validation**: [Library name and version]
* **Error Tracking**: [Service name]
* **Logging**: [Library name and version]

**Database & Storage**

* **Primary Database**: [Database name and version]
* **Caching**: [Caching strategy and technology]
* **File Storage**: [Storage solution]
* **Search**: [Search technology]

**Third-party Services**

* **Authentication**: [Service name]
* **Hosting**: [Service name]
* **Monitoring**: [Service name]
* **Error Tracking**: [Service name]

## **3. Feature Specifications**

[For each major feature]

### **3.1 [Feature Name]**

**User Stories**

* [List of user stories this feature implements]

**Technical Requirements**

* [Detailed technical requirements]

**Implementation Approach**

[Code examples, algorithms, or pseudocode for complex logic]

**Data Models**

[Relevant data models for this feature]

**API Endpoints**

[API endpoints this feature requires]

### **3.2 [Feature Name]**

[Repeat structure for each feature]

## **4. Data Architecture**

### **4.1 Complete Data Models**

[Complete database schema with all models, relationships, and indexes]

### **4.2 Database Schema**

[Detailed description of database schema, including constraints and validation rules]

### **4.3 Data Migration Strategy**

[Approach for schema migrations and data migrations]

### **4.4 Data Access Patterns**

[Common data access patterns and optimization strategies]

## **5. API Specifications**

### **5.1 API Design Principles**

[Overall API design approach and standards]

### **5.2 API Endpoints**

[For each endpoint]

**Endpoint**: [HTTP Method] [Path]

**Purpose**: [Description of what this endpoint does]

**Request Parameters**:
* [Parameter name]: [Type] - [Description] [Required/Optional]

**Request Body**:
[JSON schema or example]

**Response**:
[JSON schema or example]

**Error Responses**:
* [Status code]: [Error message] - [When this occurs]

**Authentication**:
[Authentication requirements]

**Rate Limiting**:
[Rate limiting rules]

### **5.3 Webhook Integration**

[If applicable, webhook specifications]

## **6. Security & Privacy**

### **6.1 Authentication & Authorization**

[Detailed authentication flow and authorization rules]

### **6.2 Data Security**

[Encryption, data protection, and security measures]

### **6.3 Rate Limiting**

[Rate limiting strategy and implementation]

### **6.4 Input Validation**

[Approach to input validation and sanitization]

### **6.5 GDPR/Privacy Compliance**

[Privacy measures and compliance considerations]

## **7. Infrastructure & Deployment**

### **7.1 Environment Configuration**

[Environment variables and configuration management]

### **7.2 CI/CD Pipeline**

[Continuous integration and deployment workflow]

### **7.3 Hosting Requirements**

[Server/hosting specifications and requirements]

### **7.4 Scaling Strategy**

[Approach to scaling the application]

### **7.5 Monitoring & Alerting**

[Monitoring setup and alerting thresholds]

## **8. Performance Optimization**

### **8.1 Frontend Optimizations**

[Frontend performance strategies]

### **8.2 Database Optimizations**

[Database performance tuning]

### **8.3 Caching Strategy**

[Caching approach at various levels]

### **8.4 Network Optimizations**

[API and network performance considerations]

## **9. Project Structure**

[Detailed folder structure and organization]

## **10. Implementation Plan**

### **10.1 Development Phases**

[Phased approach to implementation]

### **10.2 Task Breakdown**

[Detailed task list with dependencies]

### **10.3 Timeline Estimation**

[Estimated timeline for implementation]

## **11. Testing Strategy**

### **11.1 Unit Testing**

[Unit testing approach and coverage goals]

### **11.2 Integration Testing**

[Integration testing strategy]

### **11.3 End-to-End Testing**

[E2E testing approach]

### **11.4 Performance Testing**

[Performance testing methodology]

## **12. Critical Questions or Clarifications**

1. [Question 1]
2. [Question 2]
3. [Question 3]
4. [Question 4]
5. [Question 5]
</format>

<warnings-and-guidance>
- Be extremely precise and detailed in your specifications
- Include actual code examples for complex or critical parts
- Provide complete data models with field types, constraints, and relationships
- Define all API endpoints with full request/response specifications
- Include security considerations for every feature
- Specify exact versions for all technologies
- Define clear boundaries between system components
- Address error handling comprehensively
- Consider scalability in all architectural decisions
- Provide specific performance targets and optimization strategies
- Include deployment and infrastructure requirements
- Define testing approaches for all components
- Anticipate integration challenges with third-party services
- Consider both happy paths and edge cases
- Use diagrams (Mermaid) for complex architectural concepts
- Ensure the specification is actionable and implementation-ready
- Highlight any technical risks or challenges
- Provide alternatives for technically challenging components
- Include references to relevant documentation or standards
- Consider future extensibility in the design
</warnings-and-guidance>

<context>
<previous-stages>
${JSON.stringify(previousStages, null, 2)}
</previous-stages>

<technical-requirements>
${technicalRequirements}
</technical-requirements>
</context>

After completing the technical specification, also provide your response in JSON format that can be parsed programmatically:

{
  "executiveSummary": {
    "overview": "string",
    "keyTechnicalDecisions": {
      "frontend": "string",
      "backend": "string",
      "database": "string",
      "authentication": "string",
      "deployment": "string"
    }
  },
  "systemArchitecture": {
    "overview": "string",
    "frontendArchitecture": ["string"],
    "backendArchitecture": ["string"],
    "dataFlow": ["string"],
    "technologyStack": {
      "frontend": {"framework": "string", "uiLibrary": "string", "stateManagement": "string", "dataFetching": "string", "styling": "string"},
      "backend": {"runtime": "string", "apiLayer": "string", "orm": "string", "validation": "string"},
      "database": {"primary": "string", "caching": "string", "fileStorage": "string", "search": "string"},
      "thirdPartyServices": {"authentication": "string", "hosting": "string", "monitoring": "string"}
    }
  },
  "features": [
    {
      "name": "string",
      "userStories": ["string"],
      "technicalRequirements": ["string"],
      "implementationApproach": "string",
      "dataModels": ["string"],
      "apiEndpoints": ["string"]
    }
  ],
  "dataArchitecture": {
    "dataModels": ["string"],
    "schema": "string",
    "migrationStrategy": "string",
    "accessPatterns": ["string"]
  },
  "apiSpecifications": {
    "designPrinciples": ["string"],
    "endpoints": [
      {
        "path": "string",
        "method": "string",
        "purpose": "string",
        "requestParameters": [{"name": "string", "type": "string", "description": "string", "required": boolean}],
        "requestBody": "string",
        "response": "string",
        "errorResponses": [{"statusCode": number, "message": "string", "description": "string"}],
        "authentication": "string",
        "rateLimiting": "string"
      }
    ]
  },
  "security": {
    "authentication": "string",
    "dataSecurity": "string",
    "rateLimiting": "string",
    "inputValidation": "string",
    "privacyCompliance": "string"
  },
  "infrastructure": {
    "environmentConfiguration": "string",
    "cicdPipeline": "string",
    "hostingRequirements": "string",
    "scalingStrategy": "string",
    "monitoring": "string"
  },
  "performanceOptimization": {
    "frontend": ["string"],
    "database": ["string"],
    "caching": ["string"],
    "network": ["string"]
  },
  "projectStructure": "string",
  "implementationPlan": {
    "phases": ["string"],
    "tasks": ["string"],
    "timeline": "string"
  },
  "testingStrategy": {
    "unitTesting": "string",
    "integrationTesting": "string",
    "e2eTesting": "string",
    "performanceTesting": "string"
  },
  "questions": ["string"]
}
`;
};

export default stage5Prompt;
