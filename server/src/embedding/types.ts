export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  maxBatchSize: number;
  embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]>;
}

export interface EmbeddingConfig {
  provider: 'voyage' | 'openai' | 'cohere';
  apiKey: string;
  model: string;
}

export interface SearchResult {
  id: string;
  distance: number;
}
