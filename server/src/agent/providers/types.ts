export interface ImageContentBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface TextContentBlock {
  type: 'text';
  text: string;
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface StreamChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done' | 'error' | 'preference_form';
  text?: string;
  tool_call?: Partial<ToolCall>;
  error?: string;
  data?: unknown;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIProvider {
  chat(messages: ProviderMessage[], tools: ToolDefinition[], systemPrompt: string): AsyncGenerator<StreamChunk>;
}
