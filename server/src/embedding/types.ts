export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  maxBatchSize: number;
  embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]>;
}

export interface EmbeddingConfig {
  provider: 'voyage' | 'dashscope' | 'openai' | 'cohere';
  apiKey: string;
  model: string;
  /** Compatible-mode base URL; only DashScope reads it today. */
  baseUrl?: string;
}

export interface SearchResult {
  id: string;
  distance: number;
}
