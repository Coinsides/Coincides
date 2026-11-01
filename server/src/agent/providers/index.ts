import type { AIProvider, ProviderConfig } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { resolveDefaultChatProvider, resolveProviderCredential } from '../../services/providerCredentials.js';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  generic: 'OpenAI Compatible',
  deepseek: 'DeepSeek',
  dashscope: 'DashScope',
};

/** The user's explicit choice wins; otherwise the first provider with a key. */
export function resolveActiveProvider(userSettings: Record<string, unknown>): string {
  return (userSettings?.active_provider as string) || resolveDefaultChatProvider() || 'anthropic';
}

export function createProvider(providerName: string, config: ProviderConfig): AIProvider {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
    case 'generic':
    case 'deepseek':
    case 'dashscope':
      return new OpenAIProvider({ ...config, providerName });
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function getProviderFromSettings(userSettings: Record<string, unknown>): {
  provider: AIProvider;
  providerName: string;
} {
  const activeProvider = resolveActiveProvider(userSettings);
  const aiProviders = userSettings?.ai_providers as Record<string, Record<string, string>> | undefined;
  const providerConfig = aiProviders?.[activeProvider];

  const apiKey = resolveProviderCredential(activeProvider);
  let model = providerConfig?.default_model;
  let baseUrl = providerConfig?.base_url;

  if (!apiKey) {
    const label = PROVIDER_LABELS[activeProvider] || activeProvider;
    throw new Error(
      `The selected AI provider (${label}) has no API key. In Settings, switch to a provider that has a key, or add a key for ${label}.`,
    );
  }

  if (activeProvider === 'deepseek' || activeProvider === 'dashscope') {
    model ||= activeProvider === 'deepseek' ? 'deepseek-flash' : 'qwen-plus';
    baseUrl ||= activeProvider === 'deepseek'
      ? 'https://api.deepseek.com'
      : 'https://dashscope.aliyuncs.com/compatible-mode';
    // OpenAIProvider appends /v1; normalize only these new settings branches.
    baseUrl = baseUrl.replace(/\/v1\/?$/, '');
  }

  if (!model) {
    // Environment default outranks the hardcoded fallback; the hardcoded ID
    // must be a currently served model or every fresh user 404s on first chat.
    model = activeProvider === 'anthropic'
      ? (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6')
      : (process.env.OPENAI_MODEL || 'gpt-4o');
  }

  return {
    provider: createProvider(activeProvider, { apiKey, model, baseUrl }),
    providerName: activeProvider,
  };
}

export type { AIProvider, ProviderConfig, ProviderMessage, ProviderChatOptions, ToolCall, ToolResult, ToolDefinition, StreamChunk } from './types.js';
