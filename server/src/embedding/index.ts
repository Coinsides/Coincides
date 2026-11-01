import type { EmbeddingProvider, EmbeddingConfig } from './types.js';
import { VoyageProvider } from './voyage.js';
import {
  createDashScopeEmbeddingProvider,
  DASHSCOPE_EMBEDDING_DIMENSIONS,
  DASHSCOPE_EMBEDDING_MODEL,
} from './dashscope.js';
import { getDb } from '../db/init.js';
import { resolveDefaultEmbeddingProvider, resolveProviderCredential } from '../services/providerCredentials.js';

export type { EmbeddingProvider, EmbeddingConfig, SearchResult } from './types.js';

/**
 * Get the embedding provider based on user settings or env vars.
 * Returns null if no API key is available (graceful degradation).
 */
export function getEmbeddingProvider(userId?: string): EmbeddingProvider | null {
  // User settings carry provider/model metadata only; credentials are machine-local.
  if (userId) {
    try {
      const db = getDb();
      const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId) as { settings: string } | undefined;
      if (user?.settings) {
        const settings = JSON.parse(user.settings);
        const config = getConfigFromSettings(settings);
        if (config) {
          return createProvider(config);
        }
      }
    } catch (err) {
      console.error('Embedding generation failed:', err);
      // Fall through to env
    }
  }

  // Fall back to env: voyage keeps priority so existing machines are unchanged.
  const envKey = resolveProviderCredential('voyage');
  if (envKey) {
    return new VoyageProvider(envKey, 'voyage-4');
  }
  const dashscopeKey = resolveProviderCredential('dashscope');
  if (dashscopeKey) {
    return new DashScopeEmbeddingAdapter();
  }

  return null;
}

/**
 * Get embedding config from user settings object.
 */
function getConfigFromSettings(settings: Record<string, unknown>): EmbeddingConfig | null {
  const provider = (settings.embedding_provider as string | undefined) || resolveDefaultEmbeddingProvider() || undefined;
  const apiKey = resolveProviderCredential(provider || 'voyage');
  const model = settings.embedding_model as string | undefined;

  if (!apiKey) return null;

  if (provider === 'dashscope') {
    // Reuse the chat provider's base URL so one setting picks the region.
    const aiProviders = settings.ai_providers as Record<string, { base_url?: string }> | undefined;
    return {
      provider: 'dashscope',
      apiKey,
      model: model || DASHSCOPE_EMBEDDING_MODEL,
      baseUrl: aiProviders?.dashscope?.base_url || undefined,
    };
  }

  return {
    provider: (provider || 'voyage') as EmbeddingConfig['provider'],
    apiKey,
    model: model || 'voyage-4',
  };
}

/**
 * Create a provider instance from config.
 */
function createProvider(config: EmbeddingConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'voyage':
      return new VoyageProvider(config.apiKey, config.model);
    case 'dashscope':
      if (config.model !== DASHSCOPE_EMBEDDING_MODEL) {
        throw new Error(`Unsupported DashScope embedding model: ${config.model}`);
      }
      return new DashScopeEmbeddingAdapter(config.baseUrl);
    default:
      // Future: add OpenAI, Cohere providers here
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}

const DASHSCOPE_MAX_BATCH_SIZE = 10;

/**
 * Thin shell over the imprint DashScope client. The client reads its own
 * credential and fixes model/dimensions; input type is not forwarded.
 */
export class DashScopeEmbeddingAdapter implements EmbeddingProvider {
  name = 'dashscope';
  dimensions = DASHSCOPE_EMBEDDING_DIMENSIONS;
  maxBatchSize = DASHSCOPE_MAX_BATCH_SIZE;

  private client: ReturnType<typeof createDashScopeEmbeddingProvider>;

  constructor(baseUrl?: string, options: Parameters<typeof createDashScopeEmbeddingProvider>[0] = {}) {
    this.client = createDashScopeEmbeddingProvider({ ...options, baseUrl });
  }

  async embed(texts: string[], _inputType: 'document' | 'query'): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += DASHSCOPE_MAX_BATCH_SIZE) {
      const batch = await this.client.embed(texts.slice(i, i + DASHSCOPE_MAX_BATCH_SIZE));
      results.push(...batch.vectors);
    }
    return results;
  }
}
