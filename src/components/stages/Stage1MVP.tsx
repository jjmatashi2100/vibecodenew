import React, { useState, useEffect } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';
import { useAppStore } from '../../stores/app';
import { STAGE_PROMPTS } from '../../utils/prompts';

export function Stage1MVP() {
  const [concept, setConcept] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { saveStageData, getContextForStage, currentProject } = useProjectStore();
  const { llm } = useAppStore();

  /* ------------------------------------------------------------------
     Hydrate concept / output from autosave on mount or project change
  -------------------------------------------------------------------*/
  useEffect(() => {
    const auto = currentProject?.settings?.autosave?.stage1;
    if (auto) {
      if (auto.concept && !concept) setConcept(auto.concept);
      if (auto.output && !output) setOutput(auto.output);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  /* ------------------------------------------------------------------
     Autosave every 10 s whenever concept/output change
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!currentProject?.id) return;
    if (!concept.trim() && !output.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const existing = currentProject.settings || {};
        const newSettings = {
          ...existing,
          autosave: {
            ...(existing.autosave || {}),
            stage1: {
              concept,
              output,
              ts: Date.now(),
            },
          },
        };
        await (window as any).electronAPI.updateProject(
          currentProject.id,
          { settings: newSettings },
        );
      } catch (e) {
        console.error('Autosave failed:', e);
      }
    }, 10_000);

    return () => clearTimeout(timer);
  }, [concept, output, currentProject?.id]);

  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(1);
    const prompt = STAGE_PROMPTS.stage1.initial(concept, context);
    
    try {
      const result = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0.3,
        maxTokens: 1800
      });

      // Handle error object response
      if (typeof result !== 'string' && result && (result as any).error) {
        setOutput(`Error: ${(result as any).error}`);
        setQuestions([]);
        return;
      }
      
      if (typeof result === 'string') {
        setOutput(result);
        
        // Try to parse questions from output
        try {
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || 
                           result.match(/{[\s\S]*}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
            if (parsed.questions || parsed.QUESTIONS || parsed["CRITICAL QUESTIONS"]) {
              const extractedQuestions = parsed.questions || 
                                        parsed.QUESTIONS || 
                                        parsed["CRITICAL QUESTIONS"] || [];
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
        await saveStageData(1, {
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
          Stage 1: MVP Definition
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Describe your app concept
          </label>
          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="A desktop app that helps developers..."
          />
        </div>
        
        <button
          onClick={generate}
          disabled={isGenerating || !concept}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Generating...
            </span>
          ) : (
            'Generate MVP Plan'
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated MVP Plan
          </h3>
          <Editor
            value={output}
            onChange={setOutput}
            language="markdown"
            height="400px"
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
    </div>
  );
}
