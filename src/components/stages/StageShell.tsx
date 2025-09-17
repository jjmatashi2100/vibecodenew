import React, { useState, useEffect } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';
import { useAppStore } from '../../stores/app';
import { STAGE_PROMPTS } from '../../utils/prompts';

interface StageShellProps {
  stageId: number;
  title: string;
  inputLabel: string;
  inputKey: string;
  placeholder?: string;
  editorLanguage?: string;
  editorHeight?: string;
  hidePrev?: boolean;
}

export function StageShell({
  stageId,
  title,
  inputLabel,
  inputKey,
  placeholder = '',
  editorLanguage = 'markdown',
  editorHeight = '500px',
  hidePrev = false,
}: StageShellProps) {
  // Local state
  // ------------------------------------------------------------------
  // Typed key helper so TypeScript knows we're indexing correctly
  // ------------------------------------------------------------------
  const stageKey = `stage${stageId}` as keyof typeof STAGE_PROMPTS;

  // Casted prompts helper to bypass optional properties on some stages
  const prompts = STAGE_PROMPTS[stageKey] as any;

  const [inputValue, setInputValue] = useState('');
  const [output, setOutput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  // Store access
  const {
    saveStageData,
    getContextForStage,
    workflowPrev,
    acceptStage,
    currentProject,
    isStageAccepted,
  } = useProjectStore();
  const { llm } = useAppStore();
  
  // Check if this stage is already accepted
  const accepted = isStageAccepted(stageId);

  /* --------------------------------------------------
     Utility to safely parse strict JSON from LLM text
  -------------------------------------------------- */
  function parseJsonStrict(text: string) {
    try {
      const match =
        text.match(/```json\s*([\s\S]*?)\s*```/i) ||
        text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[1] ?? match[0]);
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /* --------------------------------------------------
     Helper to check if JSON is incomplete/invalid
  -------------------------------------------------- */
  function isIncompleteJson(text: string): boolean {
    return !parseJsonStrict(text);
  }

  /* --------------------------------------------------
     Helper to continue generating from partial JSON
  -------------------------------------------------- */
  async function continueJson(partial: string, budget: number): Promise<string> {
    // Get the last ~1000 chars to provide context
    const lastChunk = partial.slice(Math.max(0, partial.length - 1000));
    
    const continuePrompt = `You were generating a JSON response but it was cut off. 
Continue exactly where you stopped. DO NOT repeat any content.
DO NOT start with explanations or apologies.
Return ONLY the continuation of the JSON, starting from:

${lastChunk}`;

    try {
      const continuation = await (window as any).electronAPI.generateContent(continuePrompt, {
        model: llm.selectedModel?.id,
        temperature: 0.2, // Lower temperature for more deterministic continuation
        maxTokens: budget,
        unbounded: true, // Try to use unbounded if provider supports it
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
      });
      
      return typeof continuation === 'string' ? continuation : '';
    } catch (error) {
      console.error('Continuation error:', error);
      return '';
    }
  }

  /* ------------------------------------------------------------------
     Hydrate input / output from autosave on mount or project change
  -------------------------------------------------------------------*/
  useEffect(() => {
    const auto = currentProject?.settings?.autosave?.[`stage${stageId}`];
    if (auto) {
      if (auto[inputKey] && !inputValue) setInputValue(auto[inputKey]);
      if (auto.output && !output) setOutput(auto.output);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  /* ------------------------------------------------------------------
     Autosave every 10 s whenever input/output change
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!currentProject?.id) return;
    if (!inputValue.trim() && !output.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const existing = currentProject.settings || {};
        const newSettings = {
          ...existing,
          autosave: {
            ...(existing.autosave || {}),
            [`stage${stageId}`]: {
              [inputKey]: inputValue,
              output,
              ts: Date.now(),
            },
          },
        };
        await (window as any).electronAPI.updateProject(currentProject.id, {
          settings: newSettings,
        });
      } catch (e) {
        console.error('Autosave failed:', e);
      }
    }, 10_000);

    return () => clearTimeout(timer);
  }, [inputValue, output, currentProject?.id, inputKey, stageId]);

  /* ------------------------------------------------------------------
     Generate content using the stage-specific initial prompt
  -------------------------------------------------------------------*/
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const context = getContextForStage(stageId);
    const prompt = prompts.initial(inputValue, context);
    // Per-stage initial generation budget
    const initialTokenBudget =
      stageId === 1 ? 2500 : stageId === 3 ? 2200 : 900;
    
    try {
      const result = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0.3,
        maxTokens: initialTokenBudget,
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
        unbounded: llm.params.unbounded,
      });
      
      if (typeof result === 'string') {
        let aggregate = result;
        setOutput(aggregate);
        
        // Auto-continue if the JSON is incomplete
        if (isIncompleteJson(aggregate)) {
          const continuationBudget = stageId === 1 ? 1500 : stageId === 3 ? 1200 : 800;
          
          // Try up to 2 continuation passes
          for (let pass = 0; pass < 2; pass++) {
            if (!isIncompleteJson(aggregate)) break; // Stop if we have valid JSON
            
            const continuation = await continueJson(aggregate, continuationBudget);
            if (!continuation) break; // Stop if continuation failed
            
            aggregate += continuation;
            setOutput(aggregate); // Update UI with progress
            
            // If we got valid JSON, stop continuing
            if (!isIncompleteJson(aggregate)) break;
          }
        }
        
        // Try to parse questions from output
        try {
          const jsonMatch = aggregate.match(/```json\n([\s\S]*?)\n```/) || 
                           aggregate.match(/{[\s\S]*}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
            
            // Look for questions in various fields
            const questionKeys = [
              "questions", "QUESTIONS", "CRITICAL QUESTIONS", 
              "TECHNICAL QUESTIONS", "USER FLOW QUESTIONS", 
              "DESIGN QUESTIONS", "SPECIFICATION QUESTIONS", 
              "DATA QUESTIONS", "PLANNING QUESTIONS"
            ];
            
            let extractedQuestions: any[] = [];
            for (const key of questionKeys) {
              if (parsed[key]) {
                extractedQuestions = Array.isArray(parsed[key]) 
                  ? parsed[key] 
                  : Object.values(parsed[key]);
                break;
              }
            }
            
            setQuestions(extractedQuestions);
          }
        } catch (e) {
          console.error('Failed to parse questions:', e);
          setQuestions([]);
        }
        
        // Save to database (using final aggregate with continuations)
        await saveStageData(stageId, {
          content: aggregate,
          questions: questions
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }
  
  /* ----------------- Evaluation helpers ----------------- */
  async function evaluateOutput() {
    if (!output) return;
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const prompt = prompts.evaluate(output);
      const res: any = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0,
        maxTokens: 600,
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
      });
      const parsed = typeof res === 'string' ? parseJsonStrict(res) : null;
      if (parsed) {
        setEvalResult(parsed);
        await saveStageData(stageId, { content: output, feedback: parsed });
      }
    } catch (e) {
      console.error('Evaluation error:', e);
    } finally {
      setIsEvaluating(false);
    }
  }

  async function applyOptimizations() {
    if (!evalResult?.deltas) return;
    setIsOptimizing(true);
    try {
      const prompt = prompts.optimize(output, evalResult.deltas);
      const improved = await (window as any).electronAPI.generateContent(prompt, {
        model: llm.selectedModel?.id,
        temperature: 0.3,
        maxTokens: (stageId === 1 || stageId === 3) ? 1500 : 900,
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
        unbounded: llm.params.unbounded,
      });
      
      if (typeof improved === 'string') {
        let improvedAggregate = improved;
        setOutput(improvedAggregate);
        
        // Auto-continue if the JSON is incomplete
        if (isIncompleteJson(improvedAggregate)) {
          const continuationBudget = stageId === 1 ? 1500 : stageId === 3 ? 1200 : 800;
          
          // Try up to 2 continuation passes
          for (let pass = 0; pass < 2; pass++) {
            if (!isIncompleteJson(improvedAggregate)) break; // Stop if we have valid JSON
            
            const continuation = await continueJson(improvedAggregate, continuationBudget);
            if (!continuation) break; // Stop if continuation failed
            
            improvedAggregate += continuation;
            setOutput(improvedAggregate); // Update UI with progress
            
            // If we got valid JSON, stop continuing
            if (!isIncompleteJson(improvedAggregate)) break;
          }
        }
        
        setEvalResult(null);
        await saveStageData(stageId, { 
          content: improvedAggregate, 
          feedback: evalResult 
        });
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
      <div className="bg-gray-700 rounded-lg p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Stage {stageId}: {title}
          </h2>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              accepted
                ? 'bg-green-700 text-green-100'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {accepted ? 'Accepted' : 'Draft'}
          </span>
        </div>
        {/* Compact action toolbar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={generate}
            disabled={isGenerating}
            className="px-4 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating…' : 'Generate'}
          </button>

          <button
            onClick={evaluateOutput}
            disabled={!output || isGenerating || isEvaluating}
            className="px-4 py-1 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isEvaluating ? 'Evaluating…' : 'Evaluate'}
          </button>

          <button
            onClick={applyOptimizations}
            disabled={!evalResult?.deltas || isOptimizing}
            className="px-4 py-1 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isOptimizing ? 'Optimizing…' : 'Optimize'}
          </button>

          <button
            onClick={() => acceptStage(stageId, output)}
            disabled={accepted || !output}
            className={`px-4 py-1 text-sm rounded-md ${
              accepted || !output
                ? 'bg-green-800 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {accepted ? 'Accepted' : 'Accept'}
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {inputLabel}
          </label>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder={placeholder}
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
            `Generate ${title}`
          )}
        </button>
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6 mb-4">
          <h3 className="text-xl font-semibold text-white mb-4">
            Generated {title}
          </h3>
          <Editor
            value={output}
            onChange={setOutput}
            language={editorLanguage}
            height={editorHeight}
          />
        </div>
      )}
      
      {/* Questions Section */}
      {questions.length > 0 && (
        <div className="mb-4">
          <QuestionPanel
            questions={questions}
            onSubmit={handleFeedback}
          />
        </div>
      )}
      
      {/* Evaluation & Optimization */}
      {output && (
        <div className="space-y-4 mb-4">
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
              {evalResult.summary && (
                <p className="text-white mb-3">{evalResult.summary}</p>
              )}
              <ul className="list-disc pl-5 text-gray-300 mb-3">
                {evalResult.checklist?.map((c: any, i: number) => (
                  <li key={i} className={c.pass ? 'text-green-400' : 'text-red-400'}>
                    {c.criterion}: {c.pass ? 'Pass' : 'Fail'} – {c.notes}
                  </li>
                ))}
              </ul>
              <p className="text-gray-400 mb-3">
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
          <button
            onClick={() => workflowPrev()}
            disabled={hidePrev}
            className={`px-6 py-2 ${
              hidePrev 
                ? 'bg-gray-600 text-white cursor-not-allowed' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          
          <button
            onClick={() => acceptStage(stageId, output)}
            disabled={accepted}
            className={`px-6 py-2 rounded-md ${
              accepted
                ? 'bg-green-800 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {accepted ? 'Accepted' : 'Accept & Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
