/**
 * Prompt template for Stage 8: Export & Handoff
 * 
 * This prompt helps format all the accumulated data from previous stages
 * into various export formats suitable for different AI coding platforms.
 */

interface PreviousStageData {
  stage1?: any; // MVP Definition
  stage2?: any; // Technical Architecture
  stage3?: any; // User Flow Mapping
  stage4?: any; // Style Guides and State Designs
  stage5?: any; // Technical Specification
  stage6?: any; // Data Architecture
  stage7?: any; // Task Planning
}

/**
 * Generates a prompt for the Export & Handoff stage
 * @param previousStages Data from all previous stages
 * @param exportTarget The target platform for export (claude, cursor, windsurf, replit, factory)
 * @param exportOptions Additional export options or preferences
 * @returns A formatted prompt string for the LLM
 */
export const stage8Prompt = (
  previousStages: PreviousStageData,
  exportTarget: string = 'claude',
  exportOptions: string = ''
): string => {
  return `
<goal>
You are an expert in AI prompt engineering and technical documentation. Your job is to take all the accumulated data from the previous stages of the Vibe Code System and format it into a comprehensive export package optimized for the target AI coding platform.

The export should be structured in a way that maximizes the target AI platform's ability to understand and implement the complete technical specification. You should format the content appropriately for the specific platform's strengths and limitations, while ensuring all critical information is preserved.

Your export should be comprehensive yet concise, focusing on the most implementation-relevant details that will help the AI coding assistant generate accurate code based on the specifications.
</goal>

<format>
# **[Application Name] - Complete Technical Specification**

## **Project Overview**
[Concise summary of the project purpose, scope, and key features]

## **Implementation Guide**
[Instructions for the AI coding assistant on how to approach implementation]

## **System Architecture**
[High-level architecture diagram and description]

## **Technology Stack**
[Complete technology stack with versions]

## **Feature Specifications**
[For each feature, provide detailed implementation requirements]

### **[Feature Name]**
- **Purpose**: [What this feature accomplishes]
- **User Stories**: [Key user stories]
- **Technical Requirements**: [Specific technical requirements]
- **Implementation Details**: [How to implement this feature]
- **UI/UX Specifications**: [Design requirements]
- **Data Requirements**: [Data models and relationships]
- **API Endpoints**: [Related API endpoints]

## **Data Models**
[Complete database schema with relationships]

## **API Specifications**
[API endpoints with request/response formats]

## **UI Components**
[UI component specifications with states]

## **Implementation Plan**
[Task breakdown with dependencies]

## **Special Considerations**
[Any critical notes or warnings for implementation]
</format>

<warnings-and-guidance>
- Tailor the export format to match the strengths and limitations of the target AI platform
- For Claude: Use detailed markdown with clear section headers and code examples
- For Cursor: Structure the export with explicit code blocks and implementation guidance
- For Windsurf: Focus on component-based architecture and clear separation of concerns
- For Replit: Include environment setup instructions and deployment guidance
- For Factory: Emphasize file structure and system architecture
- Ensure all critical information from previous stages is included
- Prioritize implementation-relevant details over conceptual information
- Include clear instructions for the AI assistant on how to approach the implementation
- Format code examples in the appropriate language syntax
- Provide context for complex technical decisions
- Keep the export under the token limit of the target platform
- Use consistent terminology throughout the export
- Include a table of contents for easy navigation
- Highlight any areas requiring special attention
- Structure the content for progressive implementation
</warnings-and-guidance>

<context>
<previous-stages>
${JSON.stringify(previousStages, null, 2)}
</previous-stages>

<export-target>
${exportTarget}
</export-target>

<export-options>
${exportOptions}
</export-options>
</context>

After completing the export, also provide your response in JSON format that can be parsed programmatically:

{
  "projectName": "string",
  "exportTarget": "string",
  "exportTimestamp": "string",
  "sections": [
    {
      "title": "string",
      "content": "string",
      "subsections": [
        {
          "title": "string",
          "content": "string"
        }
      ]
    }
  ],
  "features": [
    {
      "name": "string",
      "purpose": "string",
      "userStories": ["string"],
      "technicalRequirements": ["string"],
      "implementationDetails": "string",
      "uiUxSpecifications": "string",
      "dataRequirements": "string",
      "apiEndpoints": ["string"]
    }
  ],
  "dataModels": ["string"],
  "apiSpecifications": ["string"],
  "uiComponents": ["string"],
  "implementationPlan": ["string"],
  "specialConsiderations": ["string"]
}
`;
};

export default stage8Prompt;
