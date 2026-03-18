import type { EmbeddingProvider } from './types.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const MAX_BATCH_SIZE = 128;

export class VoyageProvider implements EmbeddingProvider {
  name = 'voyage';
  dimensions = 1024;
  maxBatchSize = MAX_BATCH_SIZE;

  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'voyage-3') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];

    // Process in batches of MAX_BATCH_SIZE
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await this.embedBatch(batch, inputType);
      results.push(...batchResults);

      // Rate limit delay between batches
      if (i + MAX_BATCH_SIZE < texts.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return results;
  }

  private async embedBatch(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        input_type: inputType,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Voyage AI API error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      usage: { total_tokens: number };
    };

    // Sort by index to ensure order matches input
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}
