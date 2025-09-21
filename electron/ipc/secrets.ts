import { ipcMain, app } from 'electron';
import Store from 'electron-store';
import crypto from 'crypto';

// Define provider types
type Provider = 'openai' | 'anthropic' | 'gemini';
type SecretStatus = Record<Provider, boolean>;

// Constants
const SERVICE_NAME = 'VibeCodeSystem';
const STATIC_SALT = 'vibe-code-system-salt-do-not-change';

// Create a deterministic encryption key based on machine-specific data
// This is not cryptographically strong but better than plaintext
function deriveEncryptionKey(): string {
  const userData = app.getPath('userData');
  return crypto
    .createHash('sha256')
    .update(STATIC_SALT + userData)
    .digest('hex')
    .slice(0, 32); // Use first 32 chars (16 bytes) for AES-256
}

// Initialize store with encryption for fallback
const secretStore = new Store({
  name: 'secrets',
  encryptionKey: deriveEncryptionKey(),
});

// Try to load keytar dynamically to avoid hard dependency
let keytar: any = null;
try {
  keytar = require('keytar');
} catch (error) {
  console.log('Keytar not available, using encrypted store fallback');
}

/**
 * Get API key for the specified provider
 * @param provider The LLM provider
 * @returns The API key or null if not set
 */
export async function getApiKey(provider: Provider): Promise<string | null> {
  try {
    // Try keytar first if available
    if (keytar) {
      const key = await keytar.getPassword(SERVICE_NAME, provider);
      if (key) return key;
    }
    
    // Fall back to encrypted store
    const key = secretStore.get(`apiKeys.${provider}`) as string | undefined;
    return key || null;
  } catch (error) {
    console.error(`Error retrieving API key for ${provider}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Set API key for the specified provider
 * @param provider The LLM provider
 * @param value The API key to set, or null to delete
 * @returns True if successful
 */
export async function setApiKey(provider: Provider, value: string | null): Promise<boolean> {
  try {
    if (!value || value.trim() === '') {
      // Delete the key
      if (keytar) {
        await keytar.deletePassword(SERVICE_NAME, provider);
      }
      secretStore.delete(`apiKeys.${provider}`);
      return true;
    }
    
    // Set the key
    if (keytar) {
      try {
        await keytar.setPassword(SERVICE_NAME, provider, value);
        return true;
      } catch (keytarError) {
        console.error('Keytar failed, falling back to encrypted store:', 
          keytarError instanceof Error ? keytarError.message : 'Unknown error');
      }
    }
    
    // Fall back to encrypted store
    secretStore.set(`apiKeys.${provider}`, value);
    return true;
  } catch (error) {
    console.error(`Error setting API key for ${provider}:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Get the status of API keys for all providers
 * @returns Object with boolean status for each provider
 */
export async function getStatus(): Promise<SecretStatus> {
  const providers: Provider[] = ['openai', 'anthropic', 'gemini'];
  const status: Partial<SecretStatus> = {};
  
  for (const provider of providers) {
    const key = await getApiKey(provider);
    status[provider] = Boolean(key);
  }
  
  return status as SecretStatus;
}

/**
 * Set up IPC handlers for secret management
 */
export function setupSecretHandlers() {
  // Get status of all API keys
  ipcMain.handle('secrets:status', async () => {
    return getStatus();
  });
  
  // Set API keys (partial update)
  ipcMain.handle('secrets:set', async (_event, payload: Partial<Record<Provider, string | null>>) => {
    const providers = Object.keys(payload) as Provider[];
    
    for (const provider of providers) {
      if (payload[provider] !== undefined) {
        await setApiKey(provider, payload[provider]);
      }
    }
    
    return getStatus();
  });
  
  // Get a specific API key
  ipcMain.handle('secrets:get', async (_event, provider: Provider) => {
    return getApiKey(provider);
  });
}
