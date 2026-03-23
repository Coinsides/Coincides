import type { AIProvider, ProviderConfig } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { decrypt } from '../../utils/crypto.js';

export function createProvider(providerName: string, config: ProviderConfig): AIProvider {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
    case 'generic':
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

  let apiKey = providerConfig?.api_key ? decrypt(providerConfig.api_key) : undefined;
  let model = providerConfig?.default_model;

  // Fallback to env
  if (!apiKey && activeProvider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (!apiKey) {
    throw new Error('No API key configured. Go to Settings to add one.');
  }

  if (!model) {
    model = activeProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o';
  }

  return {
    provider: createProvider(activeProvider, { apiKey, model, baseUrl: providerConfig?.base_url }),
    providerName: activeProvider,
  };
}

export type { AIProvider, ProviderConfig, ProviderMessage, ToolCall, ToolResult, ToolDefinition, StreamChunk } from './types.js';
