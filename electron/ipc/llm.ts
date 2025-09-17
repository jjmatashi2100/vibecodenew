import { ipcMain } from 'electron';

/* ------------------------------------------------------------------
   Helper to enforce both an overall timeout and an inactivity timeout
   on fetch streams.
   Defaults:
     • inactivityMs – 120 000 ms  (no chunk within 120 s ⇒ abort)
     • overallMs    – 240 000 ms (total request > 4 min ⇒ abort)
-------------------------------------------------------------------*/
function createAbortGuards(inactivityMs = 120_000, overallMs = 240_000) {
  const controller = new AbortController();
  let inactivityTimer: NodeJS.Timeout | null = null;

  const startInactivity = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => controller.abort(), inactivityMs);
  };

  const overallTimer = setTimeout(() => controller.abort(), overallMs);

  const clear = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    clearTimeout(overallTimer);
  };

  return { signal: controller.signal, startInactivity, clear };
}

interface LLMProvider {
  name: string;
  endpoint: string;
  check(): Promise<boolean>; 
  generate(prompt: string, options: any): AsyncGenerator<string, void, unknown>;
  getModels(): Promise<string[]>;
}

class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  endpoint = 'http://localhost:11434';
  
  async check(): Promise<boolean> {
    try { 
      const res = await fetch(`${this.endpoint}/api/tags`); 
      return res.ok; 
    } catch { 
      return false; 
    }
  }
  
  async *generate(prompt: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    const guards = createAbortGuards(options.inactivityMs, options.overallMs);
    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: guards.signal,
        body: JSON.stringify({
          model: options.model || 'llama3.1:8b-instruct-q5_K_M',
          prompt,
          stream: true,
          options: {
            temperature: options.temperature ?? 0.3,
            num_predict: (options.unbounded ? -1 : (options.maxTokens ?? 700)),
          },
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        guards.startInactivity();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.response) yield data.response;
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('LLM stream stalled (no data for 120 s)');
      }
      throw err;
    } finally {
      guards.clear();
    }
  }
  
  async getModels(): Promise<string[]> {
    try { 
      const res = await fetch(`${this.endpoint}/api/tags`); 
      const data: any = await res.json(); 
      return data.models?.map((m: any) => m.name) || []; 
    } catch { 
      return []; 
    }
  }
}

class LMStudioProvider implements LLMProvider {
  name = 'LM Studio';
  endpoint = 'http://localhost:1234';
  
  async check(): Promise<boolean> { 
    try { 
      const r = await fetch(`${this.endpoint}/v1/models`); 
      return r.ok; 
    } catch { 
      return false; 
    } 
  }
  
  async *generate(prompt: string, options: any = {}): AsyncGenerator<string, void, unknown> {
    const model = options.model;
    if (!model) throw new Error('No model selected');

    const guards = createAbortGuards(options.inactivityMs, options.overallMs);

    // helper to stream SSE payloads
    const streamResponse = async function* (
      res: Response
    ): AsyncGenerator<string, void, unknown> {
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        guards.startInactivity();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const piece =
              json.choices?.[0]?.delta?.content ??
              json.choices?.[0]?.text;
            if (piece) yield piece;
          } catch {
            /* ignore parse errors */
          }
        }
      }
    };

    // First try chat completions endpoint
    let res: Response | null = null;
    try {
      res = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: guards.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.unbounded
            ? (options.maxTokens ?? 4096)
            : (options.maxTokens ?? 700),
          temperature: options.temperature ?? 0.3,
          stream: true
        })
      });
      if (!res.ok) throw new Error('chat/completions not ok');
      for await (const chunk of streamResponse(res)) {
        yield chunk;
      }
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        guards.clear();
        throw new Error('LLM stream stalled (no data for 120 s)');
      }
      /* fall through to completions */
    }

    // Fallback to legacy completions endpoint
    {
      res = await fetch(`${this.endpoint}/v1/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: guards.signal,
        body: JSON.stringify({
          model,
          prompt,
          max_tokens: options.unbounded
            ? (options.maxTokens ?? 4096)
            : (options.maxTokens ?? 700),
          temperature: options.temperature ?? 0.3,
          stream: true
        })
      });
    }
    if (!res.ok) throw new Error(`LM Studio error: ${res.status}`);

    try {
      for await (const chunk of streamResponse(res)) {
        yield chunk;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('LLM stream stalled (no data for 120 s)');
      }
      throw err;
    } finally {
      guards.clear();
    }
  }
  
  async getModels(): Promise<string[]> { 
    try { 
      const r = await fetch(`${this.endpoint}/v1/models`); 
      const d: any = await r.json(); 
      return d.data?.map((m: any) => m.id) || []; 
    } catch { 
      return []; 
    } 
  }
}

class LLMManager {
  private providers = new Map<string, LLMProvider>();
  private active: LLMProvider | null = null;
  
  constructor() { 
    this.providers.set('ollama', new OllamaProvider()); 
    this.providers.set('lmstudio', new LMStudioProvider()); 
  }

  public getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
  
  async detectAndConnect(): Promise<{ provider: string, models: string[] } | null> {
    /* ------------------------------------------------------------------
       If an active provider was chosen earlier (via setActiveProvider),
       keep using it as long as it is still reachable. This prevents the
       automatic probe from switching back to another provider (e.g.,
       Ollama) after the user has selected LM Studio.
    -------------------------------------------------------------------*/
    if (this.active) {
      try {
        if (await this.active.check()) {
          // find the key (name) for the active instance
          const activeEntry = [...this.providers.entries()]
            .find(([, p]) => p === this.active);
          if (activeEntry) {
            const [key] = activeEntry;
            return { provider: key, models: await this.active.getModels() };
          }
        }
      } catch {
        /* fall through to probing order below if current active is unreachable */
      }
    }

    // Probe in default order: Ollama first
    const ollama = this.providers.get('ollama')!; 
    if (await ollama.check()) { 
      this.active = ollama; 
      return { provider: 'ollama', models: await ollama.getModels() }; 
    }
    
    // Try LM Studio
    const lms = this.providers.get('lmstudio')!; 
    if (await lms.check()) { 
      this.active = lms; 
      return { provider: 'lmstudio', models: await lms.getModels() }; 
    }
    
    return null;
  }
  
  async *generate(prompt: string, options: any = {}): AsyncGenerator<string, void, unknown> { 
    if (!this.active) throw new Error('No LLM provider connected'); 
    yield* this.active.generate(prompt, options); 
  }
  
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }
  
  setActiveProvider(name: string): boolean {
    const provider = this.providers.get(name);
    if (provider) {
      this.active = provider;
      return true;
    }
    return false;
  }
}

const llmManager = new LLMManager();

export function setupLLMHandlers() {
  ipcMain.handle('llm:check', async () => llmManager.detectAndConnect());
  
  ipcMain.handle('llm:getProviders', () => {
    return llmManager.getProviderNames();
  });
  
  ipcMain.handle('llm:setProvider', async (event, providerName) => {
    return llmManager.setActiveProvider(providerName);
  });
  
  ipcMain.handle('llm:getModels', async (event, providerName) => {
    const provider = llmManager.getProvider(providerName);
    if (!provider) return [];
    return await provider.getModels();
  });
  
  ipcMain.on('llm:generate', async (event, { prompt, options, channel }) => {
    let sentAny = false;
    try {
      for await (const chunk of llmManager.generate(prompt, options)) {
        event.reply(channel, { chunk });
        sentAny = true;
      }
      event.reply(channel, { done: true });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : '';
      if (sentAny && msg.includes('stalled')) {
        // Treat stall after partial output as graceful end
        event.reply(channel, { done: true });
      } else {
        event.reply(channel, { error: msg || 'LLM error' });
      }
    }
  });
}
