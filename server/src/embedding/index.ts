import type { EmbeddingProvider, EmbeddingConfig } from './types.js';
import { VoyageProvider } from './voyage.js';
import { getDb } from '../db/init.js';
import { resolveProviderCredential } from '../services/providerCredentials.js';

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

  // Fall back to env
  const envKey = resolveProviderCredential('voyage');
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
  const apiKey = resolveProviderCredential(provider || 'voyage');
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
