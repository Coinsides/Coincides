import type { AIProvider, ProviderConfig } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

export function createProvider(providerName: string, config: ProviderConfig): AIProvider {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
    case 'generic':
    case 'deepseek':
    case 'dashscope':
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function getProviderFromSettings(userSettings: Record<string, unknown>): {
  provider: AIProvider;
  providerName: string;
} {
  const activeProvider = (userSettings?.active_provider as string) || 'anthropic';
  const aiProviders = userSettings?.ai_providers as Record<string, Record<string, string>> | undefined;
  const providerConfig = aiProviders?.[activeProvider];

  let apiKey = providerConfig?.api_key;
  let model = providerConfig?.default_model;
  let baseUrl = providerConfig?.base_url;

  // Fallback to env
  if (!apiKey && activeProvider === 'anthropic') {
    apiKey = process.env['ANTHROPIC_API_KEY'];
  }
  if (!apiKey && activeProvider === 'deepseek') {
    apiKey = process.env['DEEPSEEK_API_KEY'];
  }
  if (!apiKey && activeProvider === 'dashscope') {
    apiKey = process.env['DASHSCOPE_API_KEY'];
  }
  if (!apiKey) {
    throw new Error('No API key configured. Go to Settings to add one.');
  }

  if (activeProvider === 'deepseek' || activeProvider === 'dashscope') {
    model ||= activeProvider === 'deepseek' ? 'deepseek-chat' : 'qwen-plus';
    baseUrl ||= activeProvider === 'deepseek'
      ? 'https://api.deepseek.com'
      : 'https://dashscope-intl.aliyuncs.com/compatible-mode';
    // OpenAIProvider appends /v1; normalize only these new settings branches.
    baseUrl = baseUrl.replace(/\/v1\/?$/, '');
  }

  if (!model) {
    model = activeProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o';
  }

  return {
    provider: createProvider(activeProvider, { apiKey, model, baseUrl }),
    providerName: activeProvider,
  };
}

export type { AIProvider, ProviderConfig, ProviderMessage, ToolCall, ToolResult, ToolDefinition, StreamChunk } from './types.js';
