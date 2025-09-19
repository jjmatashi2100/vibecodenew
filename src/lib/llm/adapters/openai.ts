import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';
import { LLMAdapter, Model, GenerateOptions, AdapterConfig, ModelCapabilities } from '../service';

/**
 * Configuration for the OpenAI adapter
 */
export interface OpenAIAdapterConfig extends AdapterConfig {
  apiKey?: string;
}

/**
 * Adapter for OpenAI API
 * Implements the LLMAdapter interface to provide access to OpenAI models
 */
export class OpenAIAdapter implements LLMAdapter {
  name = 'OpenAI';
  private config: OpenAIAdapterConfig;
  private defaultModel = 'gpt-3.5-turbo';
  private availableModels: Model[] = [];
  private isConnected = false;
  private capabilities: ModelCapabilities = {
    vision: false,
    streaming: true,
    functionCalling: true
  };
  
  // Rate limiting tracking
  private lastRequestTime = 0;
  private requestCount = 0;
  private rateLimitResetTime = 0;
  
  constructor(config: OpenAIAdapterConfig) {
    this.config = config;
    
    // Set default models even before connecting
    this.availableModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        contextLength: 8192,
        description: 'Most capable GPT-4 model, better at complex tasks',
        capabilities: {
          vision: false,
          streaming: true,
          functionCalling: true
        }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        contextLength: 128000,
        description: 'Improved version of GPT-4 with larger context window',
        capabilities: {
          vision: false,
          streaming: true,
          functionCalling: true
        }
      },
      {
        id: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        provider: 'openai',
        contextLength: 128000,
        description: 'GPT-4 with vision capabilities for image understanding',
        capabilities: {
          vision: true,
          streaming: true,
          functionCalling: true
        }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        contextLength: 128000,
        description: 'Latest GPT-4 model with vision capabilities',
        capabilities: {
          vision: true,
          streaming: true,
          functionCalling: true
        }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        contextLength: 16385,
        description: 'Efficient model with good balance of capability and speed',
        capabilities: {
          vision: false,
          streaming: true,
          functionCalling: true
        }
      }
    ];
  }
  
  /**
   * Check if the OpenAI API is accessible with the provided API key
   */
  async connect(): Promise<boolean> {
    if (!this.config.apiKey) {
      console.error('OpenAI API key is missing');
      return false;
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('OpenAI API key is invalid');
          return false;
        }
        
        if (response.status === 429) {
          this.handleRateLimit(response);
          console.error('OpenAI API rate limit exceeded');
          return false;
        }
        
        console.error(`OpenAI API error: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const data = await response.json();
      
      // Filter to just the models we support
      const supportedModelIds = ['gpt-4', 'gpt-4-turbo', 'gpt-4-vision-preview', 'gpt-4o', 'gpt-3.5-turbo'];
      const availableModelIds = data.data
        .filter((model: any) => supportedModelIds.some(id => model.id.includes(id)))
        .map((model: any) => model.id);
      
      // Update available models based on what's actually available
      this.availableModels = this.availableModels.filter(model => 
        availableModelIds.some(id => id.includes(model.id))
      );
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to OpenAI API:', error);
      return false;
    }
  }
  
  /**
   * Generate text using the OpenAI API with streaming support
   */
  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    if (this.rateLimitResetTime > Date.now()) {
      throw new Error(`OpenAI API rate limit exceeded. Please try again in ${Math.ceil((this.rateLimitResetTime - Date.now()) / 1000)} seconds.`);
    }
    
    // Basic rate limiting protection
    const now = Date.now();
    if (now - this.lastRequestTime < 1000) {
      this.requestCount++;
      if (this.requestCount > 5) { // More than 5 requests per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      this.lastRequestTime = now;
      this.requestCount = 1;
    }
    
    const model = options.model || this.defaultModel;
    
    // Check if model supports vision if images are provided
    if (options.images && options.images.length > 0) {
      const modelInfo = this.availableModels.find(m => m.id === model);
      if (!modelInfo || !modelInfo.capabilities.vision) {
        throw new Error(`Model ${model} does not support image processing. Please use gpt-4-vision-preview or gpt-4o.`);
      }
    }
    
    try {
      // Format messages for the API, handling both text and images
      const messages = [];
      
      // Add system message if provided
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      // Add user message with text and images if provided
      if (options.images && options.images.length > 0) {
        // Format as content array with text and image URLs
        const content = [
          { type: 'text', text: prompt }
        ];
        
        // Add images to content array
        for (const image of options.images) {
          content.push({
            type: 'image_url',
            image_url: {
              url: image,
              detail: 'high' // Use high detail for style guide images
            }
          });
        }
        
        messages.push({ role: 'user', content });
      } else {
        // Simple text-only message
        messages.push({ role: 'user', content: prompt });
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens,
          top_p: options.topP || 1,
          stream: true
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          this.handleRateLimit(response);
          throw new Error('OpenAI API rate limit exceeded');
        }
        
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          if (event.data === '[DONE]') return;
          
          try {
            const data = JSON.parse(event.data);
            return data;
          } catch (e) {
            console.error('Failed to parse OpenAI response:', e);
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
          if (parsed && parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
            yield parsed.choices[0].delta.content;
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Get available OpenAI models
   */
  async getModels(): Promise<Model[]> {
    return this.availableModels;
  }
  
  /**
   * Get the default model ID
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Get the capabilities of this adapter
   */
  getCapabilities(): ModelCapabilities {
    return this.capabilities;
  }
  
  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }
  
  /**
   * Handle rate limit headers from OpenAI API
   */
  private handleRateLimit(response: Response): void {
    const resetHeader = response.headers.get('x-ratelimit-reset-tokens');
    if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10);
      if (!isNaN(resetTime)) {
        this.rateLimitResetTime = Date.now() + resetTime * 1000;
      }
    } else {
      // Default to 20 seconds if no header is provided
      this.rateLimitResetTime = Date.now() + 20000;
    }
    
    // Log rate limit information
    const limitHeader = response.headers.get('x-ratelimit-limit-tokens');
    const remainingHeader = response.headers.get('x-ratelimit-remaining-tokens');
    
    console.warn(`OpenAI API rate limit: ${remainingHeader}/${limitHeader} requests remaining. Reset in ${Math.ceil((this.rateLimitResetTime - Date.now()) / 1000)} seconds.`);
  }
}
