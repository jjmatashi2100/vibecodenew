import React, { useState } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';

export function Stage7TaskPlan() {
  const [taskPreferences, setTaskPreferences] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Zustand helpers, including XState workflow actions
  const { 
    saveStageData, 
    getContextForStage,
    workflowPrev,
    workflowNext
  } = useProjectStore();
  
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(7);
    const prompt = buildPrompt(taskPreferences, context);
    
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
            if (parsed.questions || parsed.QUESTIONS || parsed["PLANNING QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["PLANNING QUESTIONS"] || [];
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
        await saveStageData(7, {
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
          Stage 7: Task Planning
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Development constraints and preferences (optional)
          </label>
          <textarea
            value={taskPreferences}
            onChange={(e) => setTaskPreferences(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Team size, sprint duration, development priorities, resource constraints..."
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
            'Generate Task Plan'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Task Plan
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
              saveStageData(7, { content: output, isAccepted: true });
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

function buildPrompt(taskPreferences: string, context: any): string {
  const mvpData = context.previousStages?.stage1 || {};
  const architectureData = context.previousStages?.stage2 || {};
  const techSpecData = context.previousStages?.stage5 || {};
  const dataArchData = context.previousStages?.stage6 || {};
  
  return `You are a Project Manager creating a detailed task plan for implementing an application.

Based on the previous stages:
- MVP Definition: ${JSON.stringify(mvpData, null, 2)}
- Technical Architecture: ${JSON.stringify(architectureData, null, 2)}
- Technical Specification: ${JSON.stringify(techSpecData, null, 2)}
- Data Architecture: ${JSON.stringify(dataArchData, null, 2)}

${taskPreferences ? `Development constraints and preferences: ${taskPreferences}` : ''}

Create a comprehensive task plan including:

1. PROJECT PHASES
   - Setup and initialization
   - Core development
   - Testing and QA
   - Deployment and launch
   - Post-launch support

2. TASK BREAKDOWN
   - Feature-by-feature tasks
   - Technical implementation tasks
   - Design and UI tasks
   - Testing tasks
   - Documentation tasks

3. EFFORT ESTIMATION
   - Task complexity ratings
   - Time estimates
   - Resource requirements
   - Risk factors

4. DEPENDENCIES
   - Task dependencies
   - Critical path
   - Blockers and prerequisites

5. DEVELOPMENT ROADMAP
   - Timeline visualization
   - Milestones
   - Release planning
   - Priority ordering

6. PLANNING QUESTIONS
   - List 3-5 questions about implementation priorities or planning decisions that need clarification

Format as structured JSON with clear sections.`;
}
