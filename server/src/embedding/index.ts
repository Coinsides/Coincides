import type { EmbeddingProvider, EmbeddingConfig } from './types.js';
import { VoyageProvider } from './voyage.js';
import { queryOne } from '../db/pool.js';

export type { EmbeddingProvider, EmbeddingConfig, SearchResult } from './types.js';

/**
 * Get the embedding provider based on user settings or env vars.
 * Returns null if no API key is available (graceful degradation).
 */
export async function getEmbeddingProvider(userId?: string): Promise<EmbeddingProvider | null> {
  // Try user settings first
  if (userId) {
    try {
      const user = await queryOne(`SELECT settings FROM users WHERE id = $1`, [userId]) as { settings: string } | undefined;
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

  // Fall back to env
  const envKey = process.env.VOYAGE_API_KEY;
  if (envKey) {
    return new VoyageProvider(envKey, 'voyage-4');
  }

  return null;
}

/**
 * Get embedding config from user settings object.
 */
function getConfigFromSettings(settings: Record<string, unknown>): EmbeddingConfig | null {
  const provider = settings.embedding_provider as string | undefined;
  const apiKey = settings.embedding_api_key as string | undefined;
  const model = settings.embedding_model as string | undefined;

  if (!apiKey) return null;

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
    default:
      // Future: add OpenAI, Cohere providers here
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}
