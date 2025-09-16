import React, { useState } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';

export function Stage3UserFlow() {
  const [userScenarios, setUserScenarios] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { saveStageData, getContextForStage, workflowPrev, workflowNext } = useProjectStore();
  
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(3);
    const prompt = buildPrompt(userScenarios, context);
    
    try {
      const result = await window.electronAPI.generateContent(prompt, {
        model: 'mixtral:8x7b-instruct-q4_K_M',
        temperature: 0.3,
        maxTokens: 800
      });
      
      if (typeof result === 'string') {
        setOutput(result);
        
        // Try to parse questions from output
        try {
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                           result.match(/{[\s\S]*}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
            if (parsed.questions || parsed.QUESTIONS || parsed["USER FLOW QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["USER FLOW QUESTIONS"] || [];
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
        await saveStageData(3, {
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
          Stage 3: User Flow
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional user scenarios or journey details (optional)
          </label>
          <textarea
            value={userScenarios}
            onChange={(e) => setUserScenarios(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Describe specific user journeys, key interactions, or scenarios to focus on..."
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
            'Generate User Flows'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated User Flows
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
              saveStageData(3, { content: output, isAccepted: true });
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

function buildPrompt(userScenarios: string, context: any): string {
  const mvpData = context.previousStages?.stage1 || {};
  const architectureData = context.previousStages?.stage2 || {};
  
  return `You are a UX Designer creating detailed user flows for an application.

Based on the MVP definition:
${JSON.stringify(mvpData, null, 2)}

And the technical architecture:
${JSON.stringify(architectureData, null, 2)}

${userScenarios ? `Additional user scenarios: ${userScenarios}` : ''}

Design comprehensive user flows including:

1. USER PERSONAS
   - Primary persona details
   - Secondary persona details
   - Goals and pain points

2. KEY USER JOURNEYS
   - Onboarding flow
   - Core feature flows
   - Account management flows
   - Edge cases and error handling

3. SCREEN MAPS
   - Screen hierarchy
   - Navigation patterns
   - Information architecture

4. INTERACTION DETAILS
   - User inputs and system responses
   - Feedback mechanisms
   - Transitions and states

5. USER FLOW DIAGRAMS
   - Detailed flowcharts for each key journey (describe in detail)
   - Decision points and branches
   - Success and failure paths

6. USER FLOW QUESTIONS
   - List 3-5 questions about user experience trade-offs or clarifications needed

Format as structured JSON with clear sections.`;
}
