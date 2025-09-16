import React, { useState } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';

export function Stage5TechSpec() {
  const [techRequirements, setTechRequirements] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  /* ------------------------------------------------------------
     Zustand store helpers, including XState workflow actions
  ------------------------------------------------------------ */
  const {
    saveStageData,
    getContextForStage,
    workflowPrev,
    workflowNext,
  } = useProjectStore();
  
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(5);
    const prompt = buildPrompt(techRequirements, context);
    
    try {
      const result = await window.electronAPI.generateContent(prompt, {
        model: 'mixtral:8x7b-instruct-q4_K_M',
        temperature: 0.3,
        maxTokens: 900
      });
      
      if (typeof result === 'string') {
        setOutput(result);
        
        // Try to parse questions from output
        try {
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                           result.match(/{[\s\S]*}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
            if (parsed.questions || parsed.QUESTIONS || parsed["SPECIFICATION QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["SPECIFICATION QUESTIONS"] || [];
              setQuestions(Array.isArray(extractedQuestions) 
                ? extractedQuestions 
                : Object.values(extractedQuestions));
            }
          }
        } catch (e) {
          console.error('Failed to parse questions:', e);
          setQuestions([]);
        }
        
        // Save to database
        await saveStageData(5, {
          content: result,
          questions: questions
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }
  
  async function handleFeedback(answers: any[]) {
    // In a more complete implementation, we would:
    // 1. Build a new prompt incorporating the answers
    // 2. Generate a refined version with feedback
    
    // For now, just regenerate
    await generate();
  }
  
  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Stage 5: Technical Specification
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional technical requirements or implementation details (optional)
          </label>
          <textarea
            value={techRequirements}
            onChange={(e) => setTechRequirements(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Specific implementation approaches, coding standards, testing requirements..."
          />
        </div>
        
        <button
          onClick={generate}
          disabled={isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Generating...
            </span>
          ) : (
            'Generate Technical Specification'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Technical Specification
          </h3>
          <Editor
            value={output}
            onChange={setOutput}
            language="markdown"
            height="500px"
          />
        </div>
      )}
      
      {/* Questions Section */}
      {questions.length > 0 && (
        <QuestionPanel
          questions={questions}
          onSubmit={handleFeedback}
        />
      )}
      
      {/* Action Buttons */}
      {output && (
        <div className="flex justify-between">
          <button
            onClick={() => workflowPrev()}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Previous
          </button>
          
          <button
            onClick={() => {
              saveStageData(5, { content: output, isAccepted: true });
              workflowNext();
            }}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Accept & Continue
          </button>
        </div>
      )}
    </div>
  );
}

function buildPrompt(techRequirements: string, context: any): string {
  const mvpData = context.previousStages?.stage1 || {};
  const architectureData = context.previousStages?.stage2 || {};
  const userFlowData = context.previousStages?.stage3 || {};
  const styleGuideData = context.previousStages?.stage4 || {};
  
  return `You are a Technical Lead creating a detailed technical specification document.

Based on the previous stages:
- MVP Definition: ${JSON.stringify(mvpData, null, 2)}
- Technical Architecture: ${JSON.stringify(architectureData, null, 2)}
- User Flows: ${JSON.stringify(userFlowData, null, 2)}
- Style Guide: ${JSON.stringify(styleGuideData, null, 2)}

${techRequirements ? `Additional technical requirements: ${techRequirements}` : ''}

Create a comprehensive technical specification including:

1. OVERVIEW
   - Project summary
   - Scope and objectives
   - Assumptions and constraints

2. FUNCTIONAL SPECIFICATIONS
   - Detailed feature descriptions
   - Business rules and logic
   - User interactions and workflows
   - Error handling and edge cases

3. TECHNICAL SPECIFICATIONS
   - Component architecture
   - API specifications
   - Database schema
   - Integration points
   - Security implementation

4. IMPLEMENTATION DETAILS
   - Development approach
   - Coding standards
   - Testing strategy
   - Performance requirements
   - Deployment process

5. DEPENDENCIES AND RISKS
   - External dependencies
   - Technical risks and mitigations
   - Compatibility requirements

6. SPECIFICATION QUESTIONS
   - List 3-5 questions about implementation details or technical decisions that need clarification

Format as structured JSON with clear sections.`;
}
