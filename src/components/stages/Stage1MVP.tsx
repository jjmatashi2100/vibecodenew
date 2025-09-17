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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const { saveStageData, getContextForStage, currentProject, acceptStage } = useProjectStore();
  const { llm } = useAppStore();

  /* Helper to safely pull JSON from LLM responses */
  function parseJsonStrict(text: string) {
    try {
      const match =
        text.match(/```json\\s*([\\s\\S]*?)\\s*```/i) ||
        text.match(/\\{[\\s\\S]*\\}/);
      if (match) return JSON.parse(match[1] ?? match[0]);
    } catch {
      /* ignore */
    }
    return null;
  }

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
  
  /* -----------------------------------------------------------
     Evaluation & Optimization helpers
  ----------------------------------------------------------- */
  async function evaluateOutput() {
    if (!output) return;
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const prompt = STAGE_PROMPTS.stage1.evaluate(output);
      const res: any = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0,
        maxTokens: 600,
      });
      const parsed = typeof res === 'string' ? parseJsonStrict(res) : null;
      if (parsed) {
        setEvalResult(parsed);
        // Persist feedback (non-accepted)
        await saveStageData(1, { content: output, feedback: parsed });
      }
    } catch (e) {
      console.error('Evaluation error:', e);
    } finally {
      setIsEvaluating(false);
    }
  }

  async function applyOptimizations() {
    if (!evalResult || !evalResult.deltas) return;
    setIsOptimizing(true);
    try {
      const prompt = STAGE_PROMPTS.stage1.optimize(output, evalResult.deltas);
      const improved = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0.3,
        maxTokens: 1800,
      });

      if (typeof improved === 'string') {
        setOutput(improved);
        setEvalResult(null); // Clear evaluation so user can re-evaluate
        await saveStageData(1, { content: improved, feedback: evalResult });
      }
    } catch (e) {
      console.error('Optimize error:', e);
    } finally {
      setIsOptimizing(false);
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

      {/* Evaluation Panel */}
      {output && (
        <div className="space-y-4">
          <button
            onClick={evaluateOutput}
            disabled={isEvaluating || isGenerating}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isEvaluating ? 'Evaluating...' : 'Evaluate'}
          </button>

          {evalResult && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                Evaluation Result (Score: {evalResult.score})
              </h4>
              <ul className="list-disc pl-5 text-gray-300 mb-2">
                {evalResult.checklist?.map((c: any, i: number) => (
                  <li key={i} className={c.pass ? 'text-green-400' : 'text-red-400'}>
                    {c.criterion}: {c.pass ? 'Pass' : 'Fail'} – {c.notes}
                  </li>
                ))}
              </ul>
              <p className="text-gray-400 mb-2">
                Suggested deltas: {evalResult.deltas?.length ?? 0}
              </p>
              <button
                onClick={applyOptimizations}
                disabled={isOptimizing}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isOptimizing ? 'Applying...' : 'Apply Optimizations'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {output && (
        <div className="flex justify-between">
          {/* Stage 1 has no real \"Previous\" target but keep visual consistency */}
          <button
            disabled
            className="px-6 py-2 bg-gray-600 text-white rounded-md cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={() => acceptStage(1, output)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Accept &amp; Continue
          </button>
        </div>
      )}
    </div>
  );
}
