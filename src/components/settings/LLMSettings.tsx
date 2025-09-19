import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { LLMService } from '../../lib/llm/service';
import { OllamaAdapter } from '../../lib/llm/adapters/ollama';
import { LMStudioAdapter } from '../../lib/llm/adapters/lmstudio';
import { OpenAIAdapter } from '../../lib/llm/adapters/openai';
import { AnthropicAdapter } from '../../lib/llm/adapters/anthropic';
import { GeminiAdapter } from '../../lib/llm/adapters/gemini';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Badge } from '../ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';
import { Eye, EyeOff, Check, X, RefreshCw, Info, AlertTriangle, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

// Define types for the LLM settings
interface LLMSettings {
  defaultProvider: string;
  openai: {
    apiKey: string;
    defaultModel: string;
  };
  anthropic: {
    apiKey: string;
    defaultModel: string;
  };
  gemini: {
    apiKey: string;
    defaultModel: string;
  };
  ollama: {
    url: string;
    defaultModel: string;
  };
  lmstudio: {
    url: string;
    defaultModel: string;
  };
}

// Define types for connection status
interface ConnectionStatus {
  ollama: boolean;
  lmstudio: boolean;
  openai: boolean;
  anthropic: boolean;
  gemini: boolean;
}

// Define types for available models
interface AvailableModels {
  ollama: Array<{id: string; name: string; contextLength?: number; description?: string}>;
  lmstudio: Array<{id: string; name: string; contextLength?: number; description?: string}>;
  openai: Array<{id: string; name: string; contextLength?: number; description?: string}>;
  anthropic: Array<{id: string; name: string; contextLength?: number; description?: string}>;
  gemini: Array<{id: string; name: string; contextLength?: number; description?: string}>;
}

// Define the LLMSettings component
export function LLMSettings() {
  // State for settings
  const [settings, setSettings] = useState<LLMSettings>({
    defaultProvider: 'ollama',
    openai: { apiKey: '', defaultModel: 'gpt-3.5-turbo' },
    anthropic: { apiKey: '', defaultModel: 'claude-3-sonnet-20240229' },
    gemini: { apiKey: '', defaultModel: 'gemini-pro' },
    ollama: { url: 'http://localhost:11434', defaultModel: 'llama2' },
    lmstudio: { url: 'http://localhost:1234/v1', defaultModel: 'default' }
  });

  // State for connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ollama: false,
    lmstudio: false,
    openai: false,
    anthropic: false,
    gemini: false
  });

  // State for testing connections
  const [isTesting, setIsTesting] = useState<{[key: string]: boolean}>({
    ollama: false,
    lmstudio: false,
    openai: false,
    anthropic: false,
    gemini: false
  });

  // State for available models
  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    ollama: [],
    lmstudio: [],
    openai: [],
    anthropic: [],
    gemini: []
  });

  // State for showing/hiding API keys
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({
    openai: false,
    anthropic: false,
    gemini: false
  });

  // State for error messages
  const [errors, setErrors] = useState<{[key: string]: string | null}>({
    ollama: null,
    lmstudio: null,
    openai: null,
    anthropic: null,
    gemini: null
  });

  // State for success messages
  const [successMessages, setSuccessMessages] = useState<{[key: string]: string | null}>({
    ollama: null,
    lmstudio: null,
    openai: null,
    anthropic: null,
    gemini: null
  });

  // State for current tab
  const [activeTab, setActiveTab] = useState('local');

  // State for refreshing models
  const [isRefreshing, setIsRefreshing] = useState<{[key: string]: boolean}>({
    ollama: false,
    lmstudio: false,
    openai: false,
    anthropic: false,
    gemini: false
  });

  // Effect to load settings on component mount
  useEffect(() => {
    loadSettings();
    checkLocalServices();
  }, []);

  // Load settings from electron-store
  const loadSettings = async () => {
    try {
      const savedSettings = await ipcRenderer.invoke('get-store-value', 'llm-settings');
      if (savedSettings) {
        // Merge with default settings to ensure all fields exist
        setSettings(prevSettings => ({
          ...prevSettings,
          ...savedSettings
        }));

        // Check connection status for each provider with saved settings
        if (savedSettings.openai?.apiKey) {
          testConnection('openai');
        }
        if (savedSettings.anthropic?.apiKey) {
          testConnection('anthropic');
        }
        if (savedSettings.gemini?.apiKey) {
          testConnection('gemini');
        }
      }
    } catch (error) {
      console.error('Failed to load LLM settings:', error);
    }
  };

  // Save settings to electron-store
  const saveSettings = async () => {
    try {
      await ipcRenderer.invoke('set-store-value', 'llm-settings', settings);
      showSuccessMessage('all', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      setErrors(prev => ({ ...prev, all: 'Failed to save settings' }));
    }
  };

  // Check if local LLM services are running
  const checkLocalServices = async () => {
    checkLocalService('ollama');
    checkLocalService('lmstudio');
  };

  // Check if a specific local LLM service is running
  const checkLocalService = async (service: 'ollama' | 'lmstudio') => {
    setIsTesting(prev => ({ ...prev, [service]: true }));
    clearMessages(service);

    try {
      let adapter;
      if (service === 'ollama') {
        adapter = new OllamaAdapter({ baseUrl: settings.ollama.url });
      } else {
        adapter = new LMStudioAdapter({ baseUrl: settings.lmstudio.url });
      }

      const isConnected = await adapter.connect();
      setConnectionStatus(prev => ({ ...prev, [service]: isConnected }));

      if (isConnected) {
        // Get available models
        const models = await adapter.getModels();
        setAvailableModels(prev => ({ ...prev, [service]: models }));
        showSuccessMessage(service, `Connected to ${service}`);
      } else {
        setErrors(prev => ({ ...prev, [service]: `${service} is not running or not accessible` }));
      }
    } catch (error) {
      console.error(`Failed to connect to ${service}:`, error);
      setErrors(prev => ({ ...prev, [service]: `Failed to connect to ${service}: ${error}` }));
      setConnectionStatus(prev => ({ ...prev, [service]: false }));
    } finally {
      setIsTesting(prev => ({ ...prev, [service]: false }));
    }
  };

  // Test connection to a provider
  const testConnection = async (provider: string) => {
    setIsTesting(prev => ({ ...prev, [provider]: true }));
    clearMessages(provider);

    try {
      let adapter;
      switch (provider) {
        case 'openai':
          adapter = new OpenAIAdapter({ 
            baseUrl: 'https://api.openai.com/v1', 
            apiKey: settings.openai.apiKey 
          });
          break;
        case 'anthropic':
          adapter = new AnthropicAdapter({ 
            baseUrl: 'https://api.anthropic.com/v1', 
            apiKey: settings.anthropic.apiKey 
          });
          break;
        case 'gemini':
          adapter = new GeminiAdapter({ 
            baseUrl: 'https://generativelanguage.googleapis.com', 
            apiKey: settings.gemini.apiKey 
          });
          break;
        case 'ollama':
          adapter = new OllamaAdapter({ baseUrl: settings.ollama.url });
          break;
        case 'lmstudio':
          adapter = new LMStudioAdapter({ baseUrl: settings.lmstudio.url });
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      const isConnected = await adapter.connect();
      setConnectionStatus(prev => ({ ...prev, [provider]: isConnected }));

      if (isConnected) {
        // Get available models
        const models = await adapter.getModels();
        setAvailableModels(prev => ({ ...prev, [provider]: models }));
        showSuccessMessage(provider, `Connected to ${provider}`);
      } else {
        setErrors(prev => ({ ...prev, [provider]: `Failed to connect to ${provider}` }));
      }
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error);
      setErrors(prev => ({ ...prev, [provider]: `Failed to connect to ${provider}: ${error}` }));
      setConnectionStatus(prev => ({ ...prev, [provider]: false }));
    } finally {
      setIsTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Refresh models for a provider
  const refreshModels = async (provider: string) => {
    setIsRefreshing(prev => ({ ...prev, [provider]: true }));
    clearMessages(provider);

    try {
      await testConnection(provider);
      showSuccessMessage(provider, `Models refreshed for ${provider}`);
    } catch (error) {
      console.error(`Failed to refresh models for ${provider}:`, error);
      setErrors(prev => ({ ...prev, [provider]: `Failed to refresh models: ${error}` }));
    } finally {
      setIsRefreshing(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Clear error and success messages for a provider
  const clearMessages = (provider: string) => {
    setErrors(prev => ({ ...prev, [provider]: null }));
    setSuccessMessages(prev => ({ ...prev, [provider]: null }));
  };

  // Show success message for a provider
  const showSuccessMessage = (provider: string, message: string) => {
    setSuccessMessages(prev => ({ ...prev, [provider]: message }));
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessages(prev => ({ ...prev, [provider]: null }));
    }, 3000);
  };

  // Handle input change for settings
  const handleSettingChange = (provider: string, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider as keyof LLMSettings],
        [field]: value
      }
    }));
    clearMessages(provider);
  };

  // Handle default provider change
  const handleDefaultProviderChange = (provider: string) => {
    setSettings(prev => ({
      ...prev,
      defaultProvider: provider
    }));
    clearMessages('all');
  };

  // Toggle show/hide API key
  const toggleShowApiKey = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  // Render connection status badge
  const renderConnectionStatus = (provider: string) => {
    const isConnected = connectionStatus[provider as keyof ConnectionStatus];
    
    return (
      <Badge 
        className={`ml-2 ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
      >
        {isConnected ? (
          <><Check className="h-3 w-3 mr-1" /> Connected</>
        ) : (
          <><X className="h-3 w-3 mr-1" /> Disconnected</>
        )}
      </Badge>
    );
  };

  // Render model details tooltip
  const renderModelDetails = (model: any) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
              <Info className="h-4 w-4 text-gray-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{model.name}</p>
              {model.contextLength && (
                <p className="text-xs">Context Length: {model.contextLength.toLocaleString()} tokens</p>
              )}
              {model.description && (
                <p className="text-xs">{model.description}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render local LLM settings (Ollama, LM Studio)
  const renderLocalLLMSettings = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ollama Settings */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Ollama</h3>
                {renderConnectionStatus('ollama')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshModels('ollama')}
                  disabled={isRefreshing.ollama || isTesting.ollama}
                >
                  {isRefreshing.ollama ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => testConnection('ollama')}
                  disabled={isTesting.ollama}
                >
                  {isTesting.ollama ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="ollama-url">Ollama URL</Label>
                <Input
                  id="ollama-url"
                  value={settings.ollama.url}
                  onChange={(e) => handleSettingChange('ollama', 'url', e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
              
              <div>
                <Label htmlFor="ollama-model">Default Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.ollama.defaultModel}
                    onValueChange={(value) => handleSettingChange('ollama', 'defaultModel', value)}
                    disabled={availableModels.ollama.length === 0}
                  >
                    <SelectTrigger id="ollama-model" className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.ollama.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="flex items-center">
                          <div className="flex items-center">
                            {model.name}
                            {renderModelDetails(model)}
                          </div>
                        </SelectItem>
                      ))}
                      {availableModels.ollama.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      handleDefaultProviderChange('ollama');
                    }}
                    disabled={!connectionStatus.ollama || settings.defaultProvider === 'ollama'}
                  >
                    {settings.defaultProvider === 'ollama' ? 'Default' : 'Set as Default'}
                  </Button>
                </div>
              </div>
              
              {errors.ollama && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.ollama}</AlertDescription>
                </Alert>
              )}
              
              {successMessages.ollama && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessages.ollama}</AlertDescription>
                </Alert>
              )}
              
              {!connectionStatus.ollama && !errors.ollama && !isTesting.ollama && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Make sure Ollama is running on your computer. 
                    <a 
                      href="https://ollama.com/download" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Download Ollama
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
          
          {/* LM Studio Settings */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">LM Studio</h3>
                {renderConnectionStatus('lmstudio')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshModels('lmstudio')}
                  disabled={isRefreshing.lmstudio || isTesting.lmstudio}
                >
                  {isRefreshing.lmstudio ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => testConnection('lmstudio')}
                  disabled={isTesting.lmstudio}
                >
                  {isTesting.lmstudio ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="lmstudio-url">LM Studio URL</Label>
                <Input
                  id="lmstudio-url"
                  value={settings.lmstudio.url}
                  onChange={(e) => handleSettingChange('lmstudio', 'url', e.target.value)}
                  placeholder="http://localhost:1234/v1"
                />
              </div>
              
              <div>
                <Label htmlFor="lmstudio-model">Default Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.lmstudio.defaultModel}
                    onValueChange={(value) => handleSettingChange('lmstudio', 'defaultModel', value)}
                    disabled={availableModels.lmstudio.length === 0}
                  >
                    <SelectTrigger id="lmstudio-model" className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.lmstudio.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="flex items-center">
                          <div className="flex items-center">
                            {model.name}
                            {renderModelDetails(model)}
                          </div>
                        </SelectItem>
                      ))}
                      {availableModels.lmstudio.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      handleDefaultProviderChange('lmstudio');
                    }}
                    disabled={!connectionStatus.lmstudio || settings.defaultProvider === 'lmstudio'}
                  >
                    {settings.defaultProvider === 'lmstudio' ? 'Default' : 'Set as Default'}
                  </Button>
                </div>
              </div>
              
              {errors.lmstudio && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.lmstudio}</AlertDescription>
                </Alert>
              )}
              
              {successMessages.lmstudio && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessages.lmstudio}</AlertDescription>
                </Alert>
              )}
              
              {!connectionStatus.lmstudio && !errors.lmstudio && !isTesting.lmstudio && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Make sure LM Studio is running on your computer with the local server enabled.
                    <a 
                      href="https://lmstudio.ai/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Download LM Studio
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Render cloud LLM settings (OpenAI, Anthropic, Gemini)
  const renderCloudLLMSettings = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* OpenAI Settings */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">OpenAI</h3>
                {renderConnectionStatus('openai')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshModels('openai')}
                  disabled={isRefreshing.openai || isTesting.openai || !settings.openai.apiKey}
                >
                  {isRefreshing.openai ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => testConnection('openai')}
                  disabled={isTesting.openai || !settings.openai.apiKey}
                >
                  {isTesting.openai ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="openai-api-key" className="flex items-center">
                  API Key
                  <Lock className="h-4 w-4 ml-1 text-gray-400" />
                </Label>
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      id="openai-api-key"
                      type={showApiKeys.openai ? 'text' : 'password'}
                      value={settings.openai.apiKey}
                      onChange={(e) => handleSettingChange('openai', 'apiKey', e.target.value)}
                      placeholder="sk-..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('openai')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showApiKeys.openai ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your API key is stored securely in your system's keychain.
                </p>
              </div>
              
              <div>
                <Label htmlFor="openai-model">Default Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.openai.defaultModel}
                    onValueChange={(value) => handleSettingChange('openai', 'defaultModel', value)}
                    disabled={availableModels.openai.length === 0 && !connectionStatus.openai}
                  >
                    <SelectTrigger id="openai-model" className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show predefined models even if not connected */}
                      {(availableModels.openai.length > 0 ? availableModels.openai : [
                        { id: 'gpt-4', name: 'GPT-4', contextLength: 8192, description: 'Most capable GPT-4 model' },
                        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextLength: 128000, description: 'Improved GPT-4 with larger context' },
                        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 16385, description: 'Efficient model with good balance' }
                      ]).map((model) => (
                        <SelectItem key={model.id} value={model.id} className="flex items-center">
                          <div className="flex items-center">
                            {model.name}
                            {renderModelDetails(model)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      handleDefaultProviderChange('openai');
                    }}
                    disabled={!connectionStatus.openai || settings.defaultProvider === 'openai'}
                  >
                    {settings.defaultProvider === 'openai' ? 'Default' : 'Set as Default'}
                  </Button>
                </div>
              </div>
              
              {errors.openai && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.openai}</AlertDescription>
                </Alert>
              )}
              
              {successMessages.openai && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessages.openai}</AlertDescription>
                </Alert>
              )}
              
              {!settings.openai.apiKey && !errors.openai && !isTesting.openai && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Enter your OpenAI API key to use GPT models.
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Get API key
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
          
          {/* Anthropic Settings */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Anthropic (Claude)</h3>
                {renderConnectionStatus('anthropic')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshModels('anthropic')}
                  disabled={isRefreshing.anthropic || isTesting.anthropic || !settings.anthropic.apiKey}
                >
                  {isRefreshing.anthropic ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => testConnection('anthropic')}
                  disabled={isTesting.anthropic || !settings.anthropic.apiKey}
                >
                  {isTesting.anthropic ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="anthropic-api-key" className="flex items-center">
                  API Key
                  <Lock className="h-4 w-4 ml-1 text-gray-400" />
                </Label>
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      id="anthropic-api-key"
                      type={showApiKeys.anthropic ? 'text' : 'password'}
                      value={settings.anthropic.apiKey}
                      onChange={(e) => handleSettingChange('anthropic', 'apiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('anthropic')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showApiKeys.anthropic ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your API key is stored securely in your system's keychain.
                </p>
              </div>
              
              <div>
                <Label htmlFor="anthropic-model">Default Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.anthropic.defaultModel}
                    onValueChange={(value) => handleSettingChange('anthropic', 'defaultModel', value)}
                    disabled={availableModels.anthropic.length === 0 && !connectionStatus.anthropic}
                  >
                    <SelectTrigger id="anthropic-model" className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show predefined models even if not connected */}
                      {(availableModels.anthropic.length > 0 ? availableModels.anthropic : [
                        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextLength: 200000, description: 'Most powerful Claude model' },
                        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextLength: 200000, description: 'Balanced model with strong performance' },
                        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextLength: 200000, description: 'Fastest Claude model' }
                      ]).map((model) => (
                        <SelectItem key={model.id} value={model.id} className="flex items-center">
                          <div className="flex items-center">
                            {model.name}
                            {renderModelDetails(model)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      handleDefaultProviderChange('anthropic');
                    }}
                    disabled={!connectionStatus.anthropic || settings.defaultProvider === 'anthropic'}
                  >
                    {settings.defaultProvider === 'anthropic' ? 'Default' : 'Set as Default'}
                  </Button>
                </div>
              </div>
              
              {errors.anthropic && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.anthropic}</AlertDescription>
                </Alert>
              )}
              
              {successMessages.anthropic && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessages.anthropic}</AlertDescription>
                </Alert>
              )}
              
              {!settings.anthropic.apiKey && !errors.anthropic && !isTesting.anthropic && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Enter your Anthropic API key to use Claude models.
                    <a 
                      href="https://console.anthropic.com/settings/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Get API key
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
          
          {/* Gemini Settings */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Google Gemini</h3>
                {renderConnectionStatus('gemini')}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refreshModels('gemini')}
                  disabled={isRefreshing.gemini || isTesting.gemini || !settings.gemini.apiKey}
                >
                  {isRefreshing.gemini ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button 
                  size="sm"
                  onClick={() => testConnection('gemini')}
                  disabled={isTesting.gemini || !settings.gemini.apiKey}
                >
                  {isTesting.gemini ? (
                    <Spinner className="h-4 w-4 mr-1" />
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="gemini-api-key" className="flex items-center">
                  API Key
                  <Lock className="h-4 w-4 ml-1 text-gray-400" />
                </Label>
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      id="gemini-api-key"
                      type={showApiKeys.gemini ? 'text' : 'password'}
                      value={settings.gemini.apiKey}
                      onChange={(e) => handleSettingChange('gemini', 'apiKey', e.target.value)}
                      placeholder="AIza..."
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowApiKey('gemini')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                      {showApiKeys.gemini ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your API key is stored securely in your system's keychain.
                </p>
              </div>
              
              <div>
                <Label htmlFor="gemini-model">Default Model</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.gemini.defaultModel}
                    onValueChange={(value) => handleSettingChange('gemini', 'defaultModel', value)}
                    disabled={availableModels.gemini.length === 0 && !connectionStatus.gemini}
                  >
                    <SelectTrigger id="gemini-model" className="flex-1">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show predefined models even if not connected */}
                      {(availableModels.gemini.length > 0 ? availableModels.gemini : [
                        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextLength: 1000000, description: 'Most capable Gemini model with long context' },
                        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextLength: 1000000, description: 'Faster Gemini model with long context' },
                        { id: 'gemini-pro', name: 'Gemini Pro', contextLength: 32768, description: 'Balanced model for most tasks' }
                      ]).map((model) => (
                        <SelectItem key={model.id} value={model.id} className="flex items-center">
                          <div className="flex items-center">
                            {model.name}
                            {renderModelDetails(model)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => {
                      handleDefaultProviderChange('gemini');
                    }}
                    disabled={!connectionStatus.gemini || settings.defaultProvider === 'gemini'}
                  >
                    {settings.defaultProvider === 'gemini' ? 'Default' : 'Set as Default'}
                  </Button>
                </div>
              </div>
              
              {errors.gemini && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errors.gemini}</AlertDescription>
                </Alert>
              )}
              
              {successMessages.gemini && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{successMessages.gemini}</AlertDescription>
                </Alert>
              )}
              
              {!settings.gemini.apiKey && !errors.gemini && !isTesting.gemini && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Info</AlertTitle>
                  <AlertDescription>
                    Enter your Google AI API key to use Gemini models.
                    <a 
                      href="https://ai.google.dev/tutorials/setup" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Get API key
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">LLM Settings</h2>
        <Button onClick={saveSettings}>Save Settings</Button>
      </div>
      
      {errors.all && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errors.all}</AlertDescription>
        </Alert>
      )}
      
      {successMessages.all && (
        <Alert className="bg-green-50 text-green-800 border-green-200 mb-4">
          <Check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessages.all}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="local" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="local">Local LLMs</TabsTrigger>
          <TabsTrigger value="cloud">Cloud LLMs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="local">
          {renderLocalLLMSettings()}
        </TabsContent>
        
        <TabsContent value="cloud">
          {renderCloudLLMSettings()}
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Default Provider</h3>
        <Card className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700">
              Select which LLM provider to use by default for all operations. You can override this setting for specific tasks.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['ollama', 'lmstudio', 'openai', 'anthropic', 'gemini'].map((provider) => (
                <Button
                  key={provider}
                  variant={settings.defaultProvider === provider ? 'default' : 'outline'}
                  onClick={() => handleDefaultProviderChange(provider)}
                  disabled={!connectionStatus[provider as keyof ConnectionStatus]}
                  className="capitalize"
                >
                  {provider}
                  {settings.defaultProvider === provider && (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                </Button>
              ))}
            </div>
            
            {!Object.values(connectionStatus).some(Boolean) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Connected Providers</AlertTitle>
                <AlertDescription>
                  Please connect at least one LLM provider to use the application.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
