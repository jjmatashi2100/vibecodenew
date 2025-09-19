import { useState, useEffect, useCallback } from 'react';
import { LLMService, GenerateOptions, Model } from '@/lib/llm/service';

interface UseLLMReturn {
  llmService: LLMService | null;
  isConnected: boolean;
  isGenerating: boolean;
  error: Error | null;
  availableModels: Model[];
  currentModel: string;
  setModel: (modelId: string) => void;
  generate: (prompt: string, options?: GenerateOptions) => Promise<string>;
  supportsVision: boolean;
  visionModels: Model[];
  isLoading: boolean;
}

/**
 * Custom hook for accessing and using the LLM service
 * @returns Object with LLM service instance and utility functions
 */
export function useLLM(): UseLLMReturn {
  const [llmService, setLLMService] = useState<LLMService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [supportsVision, setSupportsVision] = useState(false);
  const [visionModels, setVisionModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize the LLM service
  useEffect(() => {
    const initLLM = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create a new LLM service instance
        const service = new LLMService();
        
        // Initialize the service
        const connected = await service.initialize();
        
        if (connected) {
          setLLMService(service);
          setIsConnected(true);
          
          // Get available models
          const models = await service.getAvailableModels();
          setAvailableModels(models);
          
          // Set current model
          setCurrentModel(service.getCurrentModel());
          
          // Check vision support
          const visionSupport = service.currentModelSupportsVision();
          setSupportsVision(visionSupport);
          
          // Get vision-capable models
          const visionCapableModels = await service.getVisionCapableModels();
          setVisionModels(visionCapableModels);
        } else {
          setError(new Error('Failed to connect to any LLM provider'));
        }
      } catch (err) {
        console.error('Error initializing LLM service:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize LLM service'));
      } finally {
        setIsLoading(false);
      }
    };
    
    initLLM();
    
    // Cleanup function
    return () => {
      // Any cleanup needed for the LLM service
    };
  }, []);
  
  // Set the current model
  const setModel = useCallback((modelId: string) => {
    if (llmService && modelId) {
      llmService.setModel(modelId);
      setCurrentModel(modelId);
      
      // Update vision support status for the new model
      const visionSupport = llmService.currentModelSupportsVision();
      setSupportsVision(visionSupport);
    }
  }, [llmService]);
  
  // Generate text using the LLM service
  const generate = useCallback(
    async (prompt: string, options: GenerateOptions = {}): Promise<string> => {
      if (!llmService) {
        throw new Error('LLM service not initialized');
      }
      
      if (isGenerating) {
        throw new Error('Generation already in progress');
      }
      
      setIsGenerating(true);
      setError(null);
      
      try {
        let fullResponse = '';
        
        // Use the generator to get streaming responses
        for await (const chunk of llmService.generate(prompt, options)) {
          fullResponse += chunk;
        }
        
        return fullResponse;
      } catch (err) {
        console.error('Error generating text:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate text';
        setError(new Error(errorMessage));
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [llmService, isGenerating]
  );
  
  // Return the hook's API
  return {
    llmService,
    isConnected,
    isGenerating,
    error,
    availableModels,
    currentModel,
    setModel,
    generate,
    supportsVision,
    visionModels,
    isLoading
  };
}

export default useLLM;
