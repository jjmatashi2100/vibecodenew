import React, { useState, useEffect } from 'react';
import { Editor } from '../common/Editor';
import { QuestionPanel } from '../common/QuestionPanel';
import { useProjectStore } from '../../stores/project';
import { useAppStore } from '../../stores/app';
import { STAGE_PROMPTS } from '../../utils/prompts';
import {
  getRequiredContext,
  summarizeContext,
} from '../../utils/dependencies';
import { adaptPromptForModel } from '../../utils/promptUtils';
import {
  validateStageOutput,
  ValidationResult,
} from '../../utils/validators';
import { schemaForStage } from '../../utils/schemas';

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
  const [isEnsuringFeatures, setIsEnsuringFeatures] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  // Derived busy state
  const isBusy = isGenerating || isEvaluating || isOptimizing || isEnsuringFeatures;

  // Store access
  const {
    saveStageData,
    getContextForStage,
    workflowPrev,
    acceptStage,
    currentProject,
    isStageAccepted,
    currentCycle,
    setCycle,
  } = useProjectStore();
  const { llm } = useAppStore();
  
  // Check if this stage is already accepted
  const accepted = isStageAccepted(stageId);
  
  // Check if we're viewing the latest cycle
  const isLatestCycle = currentCycle === (currentProject?.current_cycle ?? currentCycle);

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

  /* --------------------------------------------------
     Helper to coerce arbitrary text -> STRICT JSON
  -------------------------------------------------- */
  async function coerceToJson(text: string, budget: number): Promise<string> {
    const prompt = `You previously produced the following content but it does **not** parse as valid JSON.\n\n---\n${text}\n---\n\nConvert the entire content into STRICT JSON ONLY (no markdown fences, no commentary) that matches the following JSON schema for stage ${stageId}.\n\n${schemaForStage(stageId)}\n\nReturn ONLY the JSON.`;

    try {
      const result = await (window as any).electronAPI.generateContent(
        adaptPromptForModel(prompt, llm.selectedModel?.id),
        {
          model: llm.selectedModel?.id,
          temperature: 0.2,
          maxTokens: budget,
          unbounded: llm.params.unbounded,
          inactivityMs: llm.params.inactivityMs,
          overallMs: llm.params.overallMs,
        }
      );
      return typeof result === 'string' ? result : '';
    } catch (err) {
      console.error('Coercion error:', err);
      return '';
    }
  }

  /* ------------------------------------------------------------------
     Load content from a past cycle into the current one
  -------------------------------------------------------------------*/
  function loadIntoCurrentCycle() {
    if (!output || !currentProject) return;
    
    // Switch to the current cycle
    setCycle(currentProject.current_cycle ?? 1);
    
    // Set the output as the input for the current cycle
    setInputValue(output);
    
    // Clear the output since we're moving to a new cycle
    setOutput('');
    
    // Optionally scroll to top
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------
     Ensure minimum number of features for Stage 1
  -------------------------------------------------------------------*/
  async function ensureMinFeatures() {
    if (stageId !== 1 || !output) return;
    
    setIsEnsuringFeatures(true);
    
    try {
      const parsed = parseJsonStrict(output);
      if (!parsed) return;
      
      const min = llm.params.minMVPFeatures || 3;
      
      // Find features path (same logic as validator)
      const candidatePaths = [
        'mvp_features',
        'features',
        'core_features',
        'mvp.core_features'
      ];
      
      const addFeaturesPrompt = `You are standardizing an MVP plan to ensure it has at least ${min} core features.

Current MVP plan:
${output}

App concept: ${inputValue}

Your task:
1. Identify all existing features in the MVP plan
2. Standardize them into the "mvp_features" array format with name, description, user_story, and acceptance_criteria
3. If there are fewer than ${min} features, add more relevant features based on the app concept
4. Preserve all other content from the original plan (elevator pitch, problem statement, etc.)
5. Return the complete MVP plan as STRICT JSON only

The output must have at least ${min} items in the mvp_features array.`;

      const result = await (window as any).electronAPI.generateContent(adaptPromptForModel(addFeaturesPrompt, llm.selectedModel?.id), {
        model: llm.selectedModel?.id,
        temperature: 0.3,
        maxTokens: 900,
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
        unbounded: llm.params.unbounded,
      });
      
      if (typeof result === 'string') {
        let aggregate = result;
        setOutput(aggregate);
        
        // Auto-continue if the JSON is incomplete
        if (isIncompleteJson(aggregate)) {
          // Try up to 2 continuation passes
          for (let pass = 0; pass < 2; pass++) {
            if (!isIncompleteJson(aggregate)) break; // Stop if we have valid JSON
            
            const continuation = await continueJson(aggregate, 900);
            if (!continuation) break; // Stop if continuation failed
            
            aggregate += continuation;
            setOutput(aggregate); // Update UI with progress
            
            // If we got valid JSON, stop continuing
            if (!isIncompleteJson(aggregate)) break;
          }
          
          // If still not valid JSON, try a coercion pass
          if (isIncompleteJson(aggregate)) {
            const coerced = await coerceToJson(aggregate, 900);
            if (coerced) {
              aggregate = coerced;
              setOutput(aggregate);
            }
          }
        }
        
        // Try to parse and canonicalize
        const parsed = parseJsonStrict(aggregate);
        if (parsed) {
          aggregate = JSON.stringify(parsed, null, 2);
          setOutput(aggregate);
        }
        
        setEvalResult(null);
        
        // Save to database
        await saveStageData(stageId, {
          content: aggregate,
          cycle: currentCycle
        });
      }
    } catch (error) {
      console.error('Ensure features error:', error);
    } finally {
      setIsEnsuringFeatures(false);
    }
  }

  /* ------------------------------------------------------------------
     Hydrate input / output from autosave on mount or project/cycle change
  -------------------------------------------------------------------*/
  useEffect(() => {
    // First try autosave
    const auto = currentProject?.settings?.autosave?.[`stage${stageId}`];
    if (auto) {
      if (auto[inputKey] && !inputValue) setInputValue(auto[inputKey]);
      if (auto.output && !output) setOutput(auto.output);
    } 
    // If no autosave or we switched cycles, try to hydrate from database
    else if (currentProject?.stages) {
      // Find the latest row for this stage in the current cycle
      const stageRows = currentProject.stages
        .filter((row: any) => row.stage_number === stageId && row.cycle === currentCycle)
        .sort((a: any, b: any) => b.version - a.version);
      
      if (stageRows.length > 0) {
        try {
          const latestContent = JSON.parse(stageRows[0].content);
          setOutput(latestContent);
        } catch (e) {
          console.error('Failed to parse stage content:', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, currentCycle, stageId]);

  /* ------------------------------------------------------------------
     Validate output whenever it changes
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!output?.trim()) {
      setValidation(null);
      return;
    }
    const parsed = parseJsonStrict(output);
    if (!parsed) {
      setValidation({ valid: false, issues: ['Output is not valid JSON'] });
      return;
    }
    setValidation(validateStageOutput(stageId, parsed, { minMVPFeatures: llm.params.minMVPFeatures || 3 }));
  }, [output, stageId, llm.params.minMVPFeatures]);

  /* ------------------------------------------------------------------
     Autosave every 10 s whenever input/output change
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!currentProject?.id) return;
    if (!inputValue.trim() && !output.trim()) return;
    if (!isLatestCycle) return; // Don't autosave when viewing past cycles

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
  }, [inputValue, output, currentProject?.id, inputKey, stageId, isLatestCycle]);

  /* ------------------------------------------------------------------
     Generate content using the stage-specific initial prompt
  -------------------------------------------------------------------*/
  async function generate() {
    setIsGenerating(true);
    setOutput('');
    
    const fullContext = getContextForStage(stageId);
    const requiredPrev = getRequiredContext(
      stageId,
      fullContext?.previousStages
    );
    const contextForPrompt = {
      ...fullContext,
      previousStages: requiredPrev,
      summary: summarizeContext(requiredPrev),
    };

    const prompt = adaptPromptForModel(
      prompts.initial(inputValue, contextForPrompt),
      llm.selectedModel?.id
    );
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
          
          // If still not valid JSON, try a coercion pass
          if (isIncompleteJson(aggregate)) {
            const coerced = await coerceToJson(aggregate, 900);
            if (coerced) {
              aggregate = coerced;
              setOutput(aggregate);
            }
          }
        }
        
        // Try to parse and canonicalize
        const parsed = parseJsonStrict(aggregate);
        if (parsed) {
          aggregate = JSON.stringify(parsed, null, 2);
          setOutput(aggregate);
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
          questions: questions,
          cycle: currentCycle
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }
  
  /* ----------------- Evaluation helpers ----------------- */
  /* ------------------------ Cancel helpers ------------------------ */
  function cancelCurrent() {
    try {
      (window as any).electronAPI.cancelGenerate?.();
    } catch {
      /* ignore */
    }
    setIsGenerating(false);
    setIsEvaluating(false);
    setIsOptimizing(false);
    setIsEnsuringFeatures(false);
  }
  async function evaluateOutput() {
    if (!output) return;
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const prompt = prompts.evaluate(output);
      const wrappedPrompt = adaptPromptForModel(
        prompt,
        llm.selectedModel?.id
      );
      const res: any = await (window as any).electronAPI.generateContent(wrappedPrompt, {
        model: llm.selectedModel?.id,
        temperature: 0,
        maxTokens: 600,
        inactivityMs: llm.params.inactivityMs,
        overallMs: llm.params.overallMs,
      });
      const parsed = typeof res === 'string' ? parseJsonStrict(res) : null;
      if (parsed) {
        /* ---------------------------------------------
           Derive deterministic computed_score from rubric
        ----------------------------------------------*/
        const items = Array.isArray(parsed.checklist) ? parsed.checklist : [];
        let totalWeight = 0;
        let passWeight = 0;
        for (const it of items) {
          const w = typeof it?.weight === 'number' && it.weight > 0 ? it.weight : 1;
          totalWeight += w;
          if (it.pass === true) passWeight += w;
        }
        if (totalWeight === 0) {
          totalWeight = items.length || 1;
        }
        const computedScore =
          totalWeight > 0 ? Math.round((passWeight / totalWeight) * 100) : undefined;

        const feedback = {
          ...parsed,
          raw_score: parsed.raw_score ?? parsed.score,
          computed_score: computedScore,
        };

        setEvalResult(feedback);

        await saveStageData(stageId, {
          content: output,
          feedback,
          cycle: currentCycle
        });
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
      const score =
        evalResult?.computed_score ?? evalResult?.raw_score ?? 0;
      const prompt = adaptPromptForModel(
        prompts.optimize(output, evalResult.deltas, score),
        llm.selectedModel?.id
      );
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
          
          // If still not valid JSON, try a coercion pass
          if (isIncompleteJson(improvedAggregate)) {
            const coerced = await coerceToJson(improvedAggregate, 900);
            if (coerced) {
              improvedAggregate = coerced;
              setOutput(improvedAggregate);
            }
          }
        }
        
        // Try to parse and canonicalize
        const parsed = parseJsonStrict(improvedAggregate);
        if (parsed) {
          improvedAggregate = JSON.stringify(parsed, null, 2);
          setOutput(improvedAggregate);
        }
        
        setEvalResult(null);
        await saveStageData(stageId, { 
          content: improvedAggregate, 
          feedback: evalResult,
          cycle: currentCycle
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
            disabled={isGenerating || !isLatestCycle}
            className="px-4 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating…' : 'Generate'}
          </button>

          <button
            onClick={evaluateOutput}
            disabled={!output || isGenerating || isEvaluating || !isLatestCycle}
            className="px-4 py-1 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isEvaluating ? 'Evaluating…' : 'Evaluate'}
          </button>

          <button
            onClick={applyOptimizations}
            disabled={!evalResult?.deltas || isOptimizing || !isLatestCycle}
            className="px-4 py-1 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isOptimizing ? 'Optimizing…' : 'Optimize'}
          </button>

          {stageId === 1 && isLatestCycle && (
            <button
              onClick={ensureMinFeatures}
              disabled={!output || isEnsuringFeatures || !isLatestCycle}
              className="px-4 py-1 text-sm rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isEnsuringFeatures ? 'Adding Features…' : 'Ensure Min Features'}
            </button>
          )}

          {isBusy && isLatestCycle && (
            <button
              onClick={cancelCurrent}
              className="px-4 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Stop
            </button>
          )}

          <button
            onClick={() => acceptStage(stageId, output)}
            disabled={accepted || !output || !isLatestCycle || validation?.valid === false}
            className={`px-4 py-1 text-sm rounded-md ${
              accepted || !output || !isLatestCycle || validation?.valid === false
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
            disabled={!isLatestCycle}
          />
        </div>
        
        <button
          onClick={generate}
          disabled={isGenerating || !isLatestCycle}
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

        {isBusy && isLatestCycle && (
          <button
            onClick={cancelCurrent}
            className="ml-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Stop
          </button>
        )}
      </div>
      
      {/* Output Section */}
      {output && (
        <div className="bg-gray-700 rounded-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">
              Generated {title}
            </h3>
            
            {!isLatestCycle && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-300 font-medium">
                  Viewing Cycle {currentCycle} (read-only)
                </span>
                <button
                  onClick={loadIntoCurrentCycle}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Load into Current Cycle
                </button>
              </div>
            )}
          </div>
          
          <Editor
            value={output}
            onChange={setOutput}
            language={editorLanguage}
            height={editorHeight}
            readOnly={!isLatestCycle}
          />
          
          {/* Validation Status Panel */}
          {validation && (
            <div className={`mt-2 p-2 rounded ${
              validation.valid 
                ? 'bg-green-700/30 border border-green-600' 
                : 'bg-red-700/30 border border-red-600'
            }`}>
              {validation.valid ? (
                <p className="text-green-400 text-sm font-medium">Validation passed</p>
              ) : (
                <div>
                  <p className="text-red-400 text-sm font-medium mb-1">Validation failed:</p>
                  <ul className="list-disc pl-5 text-red-300 text-sm">
                    {validation.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Questions Section */}
      {questions.length > 0 && isLatestCycle && (
        <div className="mb-4">
          <QuestionPanel
            questions={questions}
            onSubmit={handleFeedback}
          />
        </div>
      )}
      
      {/* Evaluation & Optimization */}
      {output && isLatestCycle && (
        <div className="space-y-4 mb-4">
          <button
            onClick={evaluateOutput}
            disabled={isEvaluating || isGenerating || !isLatestCycle}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isEvaluating ? 'Evaluating...' : 'Evaluate'}
          </button>

          {isBusy && (
            <button
              onClick={cancelCurrent}
              className="ml-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Stop
            </button>
          )}

          {evalResult && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                Evaluation Result (Score: {evalResult.computed_score ?? evalResult.raw_score ?? evalResult.score})
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
                disabled={isOptimizing || !isLatestCycle}
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
          
          {isLatestCycle && (
            <button
              onClick={() => acceptStage(stageId, output)}
              disabled={accepted || !isLatestCycle || validation?.valid === false}
              className={`px-6 py-2 rounded-md ${
                accepted || !isLatestCycle || validation?.valid === false
                  ? 'bg-green-800 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {accepted ? 'Accepted' : 'Accept & Continue'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
