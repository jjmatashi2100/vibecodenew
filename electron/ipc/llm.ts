import { ipcMain } from 'electron';
import { getApiKey } from './secrets';

/* ------------------------------------------------------------------
   Helper to enforce both an overall timeout and an inactivity timeout
   on fetch streams.
   Defaults:
     • inactivityMs – 120 000 ms  (no chunk within 120 s ⇒ abort)
     • overallMs    – 240 000 ms (total request > 4 min ⇒ abort)
-------------------------------------------------------------------*/
function createAbortGuards(inactivityMs = 120_000, overallMs = 240_000, externalController?: AbortController) {
  const controller = externalController ?? new AbortController();
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

/* -------------------------------------------------------------
   Common provider interface – concrete classes implement this.
------------------------------------------------------------- */
interface LLMProvider {
  name: string;
  endpoint: string;
  check(): Promise<boolean>;
  generate(prompt: string, options: any): AsyncGenerator<string, void, unknown>;
  getModels(): Promise<string[]>;
}

/* ------------------------------------------------------------------
   Shared tiny helper to stream server-sent-events JSON lines.
-------------------------------------------------------------------*/
async function* streamSSE(
  res: Response,
  guards: ReturnType<typeof createAbortGuards>,
  extract: (json: any) => string | undefined
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
        const part = extract(json);
        if (part) yield part;
      } catch {
        /* ignore parse errors */
      }
    }
  }
}

/* ==================================================================
   OpenAI (chat/stream)
===================================================================*/
class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  endpoint = 'https://api.openai.com';

  async check(): Promise<boolean> {
    const apiKey = await getApiKey('openai');
    if (!apiKey) return false;
    try {
      const r = await fetch(`${this.endpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async *generate(prompt: string, options: any = {}): AsyncGenerator<string> {
    const apiKey = await getApiKey('openai');
    if (!apiKey) throw new Error('Missing OpenAI API key');
    const guards = createAbortGuards(options.inactivityMs, options.overallMs, options.abortController);
    try {
      const res = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        signal: guards.signal,
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          stream: true,
          temperature: options.temperature ?? 0.3,
          max_tokens: options.unbounded ? undefined : options.maxTokens ?? 700,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

      for await (const chunk of streamSSE(res, guards, (j) => j.choices?.[0]?.delta?.content)) {
        yield chunk;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('LLM stream stalled (no data for 120 s)');
      throw err;
    } finally {
      guards.clear();
    }
  }

  async getModels(): Promise<string[]> {
    const apiKey = await getApiKey('openai');
    if (!apiKey) return [];
    try {
      const r = await fetch(`${this.endpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const d: any = await r.json();
      return (d.data ?? []).map((m: any) => m.id).filter((id: string) =>
        ['gpt-4', 'gpt-4o', 'gpt-3.5'].some(k => id.includes(k))
      );
    } catch {
      return [];
    }
  }
}

/* ==================================================================
   Anthropic Claude-3
===================================================================*/
class AnthropicProvider implements LLMProvider {
  name = 'Anthropic';
  endpoint = 'https://api.anthropic.com';

  async check(): Promise<boolean> {
    return Boolean(await getApiKey('anthropic')); // minimal – full call costs quota
  }

  async *generate(prompt: string, options: any = {}): AsyncGenerator<string> {
    const apiKey = await getApiKey('anthropic');
    if (!apiKey) throw new Error('Missing Anthropic API key');
    const guards = createAbortGuards(options.inactivityMs, options.overallMs, options.abortController);
    try {
      const res = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        signal: guards.signal,
        body: JSON.stringify({
          model: options.model || 'claude-3-sonnet-20240229',
          max_tokens: options.unbounded ? 4096 : options.maxTokens ?? 700,
          temperature: options.temperature ?? 0.3,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);

      for await (const chunk of streamSSE(res, guards, (j) => {
        if (j.type === 'content_block_delta') return j.delta?.text;
        if (j.type === 'message_delta') return j.delta?.content?.[0]?.text;
        return undefined;
      })) {
        yield chunk;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('LLM stream stalled (no data for 120 s)');
      throw err;
    } finally {
      guards.clear();
    }
  }

  async getModels(): Promise<string[]> {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}

/* ==================================================================
   Google Gemini – non-streaming simple call
===================================================================*/
class GeminiProvider implements LLMProvider {
  name = 'Gemini';
  endpoint = 'https://generativelanguage.googleapis.com/v1beta';

  async check(): Promise<boolean> {
    return Boolean(await getApiKey('gemini'));
  }

  async *generate(prompt: string, options: any = {}): AsyncGenerator<string> {
    const model = options.model || 'gemini-1.5-flash-latest';
    const apiKey = await getApiKey('gemini');
    if (!apiKey) throw new Error('Missing Gemini API key');
    const url = `${this.endpoint}/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }]}],
          generationConfig: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.unbounded ? 2048 : options.maxTokens ?? 700,
            topP: options.topP ?? 0.9
          }
        })
      });
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const d: any = await res.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) yield text;
    } catch (err) {
      throw err;
    }
  }

  async getModels(): Promise<string[]> {
    return ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
  }
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
    const guards = createAbortGuards(options.inactivityMs, options.overallMs, options.abortController);
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

    const guards = createAbortGuards(options.inactivityMs, options.overallMs, options.abortController);

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
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('gemini', new GeminiProvider());
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

    /* -------------------------- Web providers -------------------------- */
    const openai = this.providers.get('openai')!;
    if (await openai.check()) {
      this.active = openai;
      return { provider: 'openai', models: await openai.getModels() };
    }

    const anthropic = this.providers.get('anthropic')!;
    if (await anthropic.check()) {
      this.active = anthropic;
      return { provider: 'anthropic', models: await anthropic.getModels() };
    }

    const gem = this.providers.get('gemini')!;
    if (await gem.check()) {
      this.active = gem;
      return { provider: 'gemini', models: await gem.getModels() };
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

/* -------------------------------------------------------------
   Track AbortControllers keyed by renderer-generated channel so
   we can cancel from the UI.
------------------------------------------------------------- */
const requestControllers = new Map<string, AbortController>();

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
    // Create controller & expose for cancellation
    const controller = new AbortController();
    requestControllers.set(channel, controller);
    // Inject into options so providers share the same signal
    options = { ...options, abortController: controller };

    let sentAny = false;
    try {
      for await (const chunk of llmManager.generate(prompt, options)) {
        event.reply(channel, { chunk });
        sentAny = true;
      }
      event.reply(channel, { done: true });
    } catch (e: any) {
      const wasCanceled = controller.signal.aborted;
      const msg = typeof e?.message === 'string' ? e.message : '';
      if (wasCanceled) {
        event.reply(channel, { canceled: true });
      } else if (sentAny && msg.includes('stalled')) {
        // Treat stall after partial output as graceful end
        event.reply(channel, { done: true });
      } else {
        event.reply(channel, { error: msg || 'LLM error' });
      }
    } finally {
      requestControllers.delete(channel);
      controller.abort(); // ensure cleanup
    }
  });
  
  /* ------------------ Cancel in-flight generation ------------------ */
  ipcMain.on('llm:cancel', (_event, channel: string) => {
    const ctrl = requestControllers.get(channel);
    if (ctrl) {
      ctrl.abort();
      requestControllers.delete(channel);
    }
  });
}
