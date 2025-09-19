import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';
import { LLMAdapter, Model, GenerateOptions, AdapterConfig, ModelCapabilities } from '../service';

/**
 * Configuration for the Anthropic adapter
 */
export interface AnthropicAdapterConfig extends AdapterConfig {
  apiKey?: string;
  version?: string;
}

/**
 * Adapter for Anthropic API (Claude models)
 * Implements the LLMAdapter interface to provide access to Claude models
 */
export class AnthropicAdapter implements LLMAdapter {
  name = 'Anthropic';
  private config: AnthropicAdapterConfig;
  private defaultModel = 'claude-3-sonnet-20240229';
  private availableModels: Model[] = [];
  private isConnected = false;
  private capabilities: ModelCapabilities = {
    vision: true,
    streaming: true,
    functionCalling: false
  };
  
  // Rate limiting tracking
  private lastRequestTime = 0;
  private requestCount = 0;
  private rateLimitResetTime = 0;
  
  constructor(config: AnthropicAdapterConfig) {
    this.config = {
      ...config,
      version: config.version || '2023-06-01'
    };
    
    // Set default models even before connecting
    this.availableModels = [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        contextLength: 200000,
        description: 'Most powerful Claude model, best for complex tasks requiring deep analysis',
        capabilities: {
          vision: true,
          streaming: true,
          functionCalling: false
        }
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        contextLength: 200000,
        description: 'Balanced model with strong performance and faster response times',
        capabilities: {
          vision: true,
          streaming: true,
          functionCalling: false
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        contextLength: 200000,
        description: 'Fastest Claude model, optimized for responsive applications',
        capabilities: {
          vision: true,
          streaming: true,
          functionCalling: false
        }
      }
    ];
  }
  
  /**
   * Check if the Anthropic API is accessible with the provided API key
   */
  async connect(): Promise<boolean> {
    if (!this.config.apiKey) {
      console.error('Anthropic API key is missing');
      return false;
    }
    
    try {
      // Anthropic doesn't have a dedicated endpoint to list models or check API key validity
      // Instead, we'll make a minimal request to test the connection
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.config.version!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Anthropic API key is invalid');
          return false;
        }
        
        if (response.status === 429) {
          this.handleRateLimit(response);
          console.error('Anthropic API rate limit exceeded');
          return false;
        }
        
        console.error(`Anthropic API error: ${response.status} ${response.statusText}`);
        return false;
      }
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to Anthropic API:', error);
      return false;
    }
  }
  
  /**
   * Generate text using the Anthropic API with streaming support
   */
  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string, void, unknown> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is missing');
    }
    
    if (this.rateLimitResetTime > Date.now()) {
      throw new Error(`Anthropic API rate limit exceeded. Please try again in ${Math.ceil((this.rateLimitResetTime - Date.now()) / 1000)} seconds.`);
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
        throw new Error(`Model ${model} does not support image processing.`);
      }
    }
    
    try {
      // Prepare messages in Anthropic format
      const messages = [];
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      // Handle messages with images
      if (options.images && options.images.length > 0) {
        // For Anthropic, we need to format content as an array of content blocks
        const content = [];
        
        // Add text content first
        content.push({
          type: 'text',
          text: prompt
        });
        
        // Add each image as a content block
        for (const image of options.images) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: this.getMediaTypeFromBase64(image),
              data: this.stripBase64Prefix(image)
            }
          });
        }
        
        messages.push({ role: 'user', content });
      } else {
        // Simple text-only message
        messages.push({ role: 'user', content: prompt });
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.config.version!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          stream: true
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          this.handleRateLimit(response);
          throw new Error('Anthropic API rate limit exceeded');
        }
        
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const parser = createParser((event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          if (event.data === '[DONE]') return;
          
          try {
            const data = JSON.parse(event.data);
            return data;
          } catch (e) {
            console.error('Failed to parse Anthropic response:', e);
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
          
          // Handle Anthropic's specific streaming format
          if (parsed && parsed.type === 'content_block_delta') {
            if (parsed.delta && parsed.delta.text) {
              yield parsed.delta.text;
            }
          } else if (parsed && parsed.type === 'message_delta') {
            // Handle potential other message formats
            if (parsed.delta && parsed.delta.content && parsed.delta.content[0] && parsed.delta.content[0].text) {
              yield parsed.delta.content[0].text;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error generating text with Anthropic:', error);
      throw error;
    }
  }
  
  /**
   * Get available Anthropic models
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
   * Handle rate limit headers from Anthropic API
   */
  private handleRateLimit(response: Response): void {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const retrySeconds = parseInt(retryAfter, 10);
      if (!isNaN(retrySeconds)) {
        this.rateLimitResetTime = Date.now() + retrySeconds * 1000;
      } else {
        // Default to 60 seconds if parsing fails
        this.rateLimitResetTime = Date.now() + 60000;
      }
    } else {
      // Default to 60 seconds if no header is provided
      this.rateLimitResetTime = Date.now() + 60000;
    }
    
    console.warn(`Anthropic API rate limit exceeded. Reset in ${Math.ceil((this.rateLimitResetTime - Date.now()) / 1000)} seconds.`);
  }
  
  /**
   * Strip the prefix from a base64 string (e.g., "data:image/jpeg;base64,")
   */
  private stripBase64Prefix(base64String: string): string {
    const match = base64String.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
    return match ? match[1] : base64String;
  }
  
  /**
   * Get the media type from a base64 string
   */
  private getMediaTypeFromBase64(base64String: string): string {
    const match = base64String.match(/^data:([^;]+);base64,/);
    return match ? match[1] : 'image/jpeg'; // Default to jpeg if not specified
  }
}
