import React, { useState } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';
import { useAppStore } from '../../stores/app';

export function Stage4StyleGuide() {
  const [designPreferences, setDesignPreferences] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { saveStageData, getContextForStage, workflowPrev, acceptStage } = useProjectStore();
  const { llm } = useAppStore();
  
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(4);
    const prompt = buildPrompt(designPreferences, context);
    
    try {
      const result = await window.electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
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
            if (parsed.questions || parsed.QUESTIONS || parsed["DESIGN QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["DESIGN QUESTIONS"] || [];
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
        await saveStageData(4, {
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
          Stage 4: Style Guide
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Design preferences and brand guidelines (optional)
          </label>
          <textarea
            value={designPreferences}
            onChange={(e) => setDesignPreferences(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Brand colors, typography preferences, design inspiration, accessibility requirements..."
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
            'Generate Style Guide'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Style Guide
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
            onClick={() => acceptStage(4, output)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Accept & Continue
          </button>
        </div>
      )}
    </div>
  );
}

function buildPrompt(designPreferences: string, context: any): string {
  const mvpData = context.previousStages?.stage1 || {};
  const userFlowData = context.previousStages?.stage3 || {};
  
  return `You are a UI/UX Designer creating a comprehensive style guide for an application.

Based on the MVP definition:
${JSON.stringify(mvpData, null, 2)}

And the user flows:
${JSON.stringify(userFlowData, null, 2)}

${designPreferences ? `Design preferences: ${designPreferences}` : ''}

Create a detailed style guide including:

1. BRAND IDENTITY
   - Logo specifications
   - Brand colors (primary, secondary, accent)
   - Typography (headings, body text, special text)
   - Voice and tone

2. UI COMPONENTS
   - Buttons (primary, secondary, tertiary)
   - Form elements (inputs, dropdowns, checkboxes)
   - Cards and containers
   - Navigation elements
   - Modals and overlays

3. LAYOUT PRINCIPLES
   - Grid system
   - Spacing and padding
   - Responsive breakpoints
   - Layout patterns

4. VISUAL ELEMENTS
   - Iconography
   - Imagery and illustrations
   - Data visualization
   - Animations and transitions

5. ACCESSIBILITY GUIDELINES
   - Color contrast requirements
   - Focus states
   - Screen reader considerations
   - Keyboard navigation

6. DESIGN QUESTIONS
   - List 3-5 questions about design decisions or clarifications needed

Format as structured JSON with clear sections.`;
}
