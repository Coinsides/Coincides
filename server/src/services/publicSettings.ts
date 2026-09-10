/** Provider credentials belong to this machine, never the user-settings payload. */
export function publicSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const { embedding_api_key: _embeddingKey, ...result } = settings;
  if (result.ai_providers && typeof result.ai_providers === 'object') {
    result.ai_providers = Object.fromEntries(
      Object.entries(result.ai_providers).map(([provider, config]) => {
        if (!config || typeof config !== 'object' || Array.isArray(config)) return [provider, {}];
        const { api_key: _key, ...metadata } = config;
        return [provider, metadata];
      }),
    );
  }
  return result;
}
