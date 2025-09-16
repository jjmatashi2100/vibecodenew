import React, { useState } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';

export function Stage6DataArch() {
  const [dataRequirements, setDataRequirements] = useState('');
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
    
    const context = getContextForStage(6);
    const prompt = buildPrompt(dataRequirements, context);
    
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
            if (parsed.questions || parsed.QUESTIONS || parsed["DATA QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["DATA QUESTIONS"] || [];
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
        await saveStageData(6, {
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
          Stage 6: Data Architecture
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional data requirements or constraints (optional)
          </label>
          <textarea
            value={dataRequirements}
            onChange={(e) => setDataRequirements(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Data retention policies, compliance requirements, expected data volume..."
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
            'Generate Data Architecture'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated Data Architecture
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
              saveStageData(6, { content: output, isAccepted: true });
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

function buildPrompt(dataRequirements: string, context: any): string {
  const mvpData = context.previousStages?.stage1 || {};
  const architectureData = context.previousStages?.stage2 || {};
  const techSpecData = context.previousStages?.stage5 || {};
  
  return `You are a Data Architect designing the data architecture for an application.

Based on the previous stages:
- MVP Definition: ${JSON.stringify(mvpData, null, 2)}
- Technical Architecture: ${JSON.stringify(architectureData, null, 2)}
- Technical Specification: ${JSON.stringify(techSpecData, null, 2)}

${dataRequirements ? `Additional data requirements: ${dataRequirements}` : ''}

Create a comprehensive data architecture including:

1. DATA MODELS
   - Entity definitions
   - Attributes and data types
   - Relationships and cardinality
   - Primary and foreign keys

2. DATABASE SCHEMA
   - Tables and collections
   - Indexes and constraints
   - Normalization/denormalization approach
   - Schema evolution strategy

3. DATA FLOWS
   - Data ingestion processes
   - Transformation logic
   - Storage patterns
   - Retrieval methods

4. DATA GOVERNANCE
   - Data ownership
   - Security and access controls
   - Compliance considerations
   - Data quality standards

5. PERFORMANCE CONSIDERATIONS
   - Query optimization
   - Caching strategy
   - Scalability approach
   - Backup and recovery

6. DATA QUESTIONS
   - List 3-5 questions about data modeling or architectural decisions that need clarification

Format as structured JSON with clear sections.`;
}
