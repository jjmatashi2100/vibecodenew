import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';

/**
 * Model capabilities flags
 */
export interface ModelCapabilities {
  vision: boolean;
  streaming: boolean;
  functionCalling?: boolean;
}

/**
 * Represents a language model available from an LLM provider
 */
export interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  description?: string;
  capabilities: ModelCapabilities;
}

/**
 * Options for generating text from an LLM
 */
export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  stream?: boolean;
  images?: string[]; // Base64 encoded images or image URLs
}

/**
 * Configuration for an LLM adapter
 */
export interface AdapterConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  capabilities?: {
    supportsVision?: boolean;
    supportsStreaming?: boolean;
    supportsFunctionCalling?: boolean;
  };
}

/**
 * Interface for LLM adapters that connect to different providers
 */
export interface LLMAdapter {
  name: string;
  connect(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): AsyncGenerator<string, void, unknown>;
  getModels(): Promise<Model[]>;
  getDefaultModel(): string;
  getCapabilities(): ModelCapabilities;
}

/**
 * Error thrown when there's an issue with LLM operations
 */
export class LLMServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

/**
 * Service for interacting with Language Models through various adapters
 */
export class LLMService {
  private adapter: LLMAdapter | null = null;
  private adapters: Map<string, LLMAdapter> = new Map();
  private currentModel: string = '';
  
  /**
   * Initialize the LLM service by attempting to connect to available adapters
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to connect to Ollama first
      const ollamaAdapter = await this.createOllamaAdapter();
      if (ollamaAdapter) {
        this.adapter = ollamaAdapter;
        this.adapters.set('ollama', ollamaAdapter);
        this.currentModel = ollamaAdapter.getDefaultModel();
        return true;
      }
      
      // Try LM Studio as fallback
      const lmStudioAdapter = await this.createLMStudioAdapter();
      if (lmStudioAdapter) {
        this.adapter = lmStudioAdapter;
        this.adapters.set('lmstudio', lmStudioAdapter);
        this.currentModel = lmStudioAdapter.getDefaultModel();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to initialize LLM service:', error);
      return false;
    }
  }
  
  /**
   * Create and connect to an Ollama adapter
   */
  private async createOllamaAdapter(): Promise<LLMAdapter | null> {
    try {
      const adapter = new OllamaAdapter({
        baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
        capabilities: {
          supportsVision: false,
          supportsStreaming: true
        }
      });
      
      const connected = await adapter.connect();
      return connected ? adapter : null;
    } catch (error) {
      console.error('Failed to create Ollama adapter:', error);
      return null;
    }
  }
  
  /**
   * Create and connect to an LM Studio adapter
   */
  private async createLMStudioAdapter(): Promise<LLMAdapter | null> {
    try {
      const adapter = new LMStudioAdapter({
        baseUrl: process.env.LM_STUDIO_HOST || 'http://localhost:1234/v1',
        capabilities: {
          supportsVision: false,
          supportsStreaming: true
        }
      });
      
      const connected = await adapter.connect();
      return connected ? adapter : null;
    } catch (error) {
      console.error('Failed to create LM Studio adapter:', error);
      return null;
    }
  }
  
  /**
   * Check if the service is connected to an LLM provider
   */
  isConnected(): boolean {
    return this.adapter !== null;
  }
  
  /**
   * Get the current adapter being used
   */
  getCurrentAdapter(): LLMAdapter | null {
    return this.adapter;
  }
  
  /**
   * Get all available adapters
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Switch to a different adapter by name
   */
  async switchAdapter(adapterName: string): Promise<boolean> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new LLMServiceError(`Adapter '${adapterName}' not found`);
    }
    
    const connected = await adapter.connect();
    if (connected) {
      this.adapter = adapter;
      this.currentModel = adapter.getDefaultModel();
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate text from the LLM using the current adapter
   */
  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    if (!this.adapter) {
      throw new LLMServiceError('No LLM adapter connected');
    }
    
    // Check if the request includes images but the model doesn't support vision
    if (options.images && options.images.length > 0 && !this.currentModelSupportsVision()) {
      throw new LLMServiceError('The current model does not support image processing');
    }
    
    try {
      yield* this.adapter.generate(prompt, {
        ...options,
        model: options.model || this.currentModel
      });
    } catch (error) {
      throw new LLMServiceError('Failed to generate text', error);
    }
  }
  
  /**
   * Get available models from the current adapter
   */
  async getAvailableModels(): Promise<Model[]> {
    if (!this.adapter) {
      throw new LLMServiceError('No LLM adapter connected');
    }
    
    try {
      return await this.adapter.getModels();
    } catch (error) {
      throw new LLMServiceError('Failed to get available models', error);
    }
  }
  
  /**
   * Set the current model to use for generation
   */
  setModel(modelId: string): void {
    this.currentModel = modelId;
  }
  
  /**
   * Get the current model being used
   */
  getCurrentModel(): string {
    return this.currentModel;
  }
  
  /**
   * Check if the current model supports vision/image processing
   */
  currentModelSupportsVision(): boolean {
    if (!this.adapter) {
      return false;
    }
    
    return this.adapter.getCapabilities().vision;
  }
  
  /**
   * Get all models that support vision/image processing
   */
  async getVisionCapableModels(): Promise<Model[]> {
    const allModels = await this.getAvailableModels();
    return allModels.filter(model => model.capabilities.vision);
  }
}

/**
 * Adapter for Ollama LLM provider
 */
class OllamaAdapter implements LLMAdapter {
  name = 'Ollama';
  private config: AdapterConfig;
  private defaultModel = 'llama2';
  private availableModels: Model[] = [];
  private capabilities: ModelCapabilities;
  
  constructor(config: AdapterConfig) {
    this.config = config;
    this.capabilities = {
      vision: config.capabilities?.supportsVision || false,
      streaming: config.capabilities?.supportsStreaming || true,
      functionCalling: config.capabilities?.supportsFunctionCalling || false
    };
  }
  
  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      this.availableModels = (data.models || []).map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        capabilities: {
          // Check model name for vision capabilities (e.g., llava, bakllava, etc.)
          vision: model.name.toLowerCase().includes('llava') || 
                 model.name.toLowerCase().includes('vision'),
          streaming: true,
          functionCalling: false
        }
      }));
      
      // Set default model if available
      if (this.availableModels.length > 0) {
        this.defaultModel = this.availableModels[0].id;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;
    
    // Handle image input for vision models
    let requestBody: any = {
      model,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature,
        top_p: options.topP,
        stop: options.stopSequences
      }
    };
    
    // Add images if provided and model supports vision
    if (options.images && options.images.length > 0) {
      const modelInfo = this.availableModels.find(m => m.id === model);
      if (!modelInfo || !modelInfo.capabilities.vision) {
        throw new Error(`Model ${model} does not support image processing`);
      }
      
      // Format depends on Ollama's multimodal API
      requestBody.images = options.images;
    }
    
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch (e) {
            console.error('Failed to parse Ollama response:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  async getModels(): Promise<Model[]> {
    return this.availableModels;
  }
  
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  getCapabilities(): ModelCapabilities {
    return this.capabilities;
  }
}

/**
 * Adapter for LM Studio (OpenAI-compatible API)
 */
class LMStudioAdapter implements LLMAdapter {
  name = 'LM Studio';
  private config: AdapterConfig;
  private defaultModel = 'default';
  private availableModels: Model[] = [];
  private capabilities: ModelCapabilities;
  
  constructor(config: AdapterConfig) {
    this.config = config;
    this.capabilities = {
      vision: config.capabilities?.supportsVision || false,
      streaming: config.capabilities?.supportsStreaming || true,
      functionCalling: config.capabilities?.supportsFunctionCalling || false
    };
  }
  
  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      this.availableModels = data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'lmstudio',
        capabilities: {
          // LM Studio currently doesn't support vision models
          vision: false,
          streaming: true,
          functionCalling: false
        }
      }));
      
      // Set default model if available
      if (this.availableModels.length > 0) {
        this.defaultModel = this.availableModels[0].id;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;
    
    // Check if images are provided but not supported
    if (options.images && options.images.length > 0) {
      throw new Error('LM Studio does not support image processing');
    }
    
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP || 1,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
    }
    
    const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
      if (event.type === 'event') {
        if (event.data === '[DONE]') return;
        
        try {
          const data = JSON.parse(event.data);
          return data;
        } catch (e) {
          console.error('Failed to parse LM Studio response:', e);
          return undefined;
        }
      }
    });
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }
    
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        parser.feed(chunk);
        
        const parsed = parser.feed(chunk);
        if (parsed && parsed.choices && parsed.choices[0].delta.content) {
          yield parsed.choices[0].delta.content;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  async getModels(): Promise<Model[]> {
    return this.availableModels;
  }
  
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  getCapabilities(): ModelCapabilities {
    return this.capabilities;
  }
}
