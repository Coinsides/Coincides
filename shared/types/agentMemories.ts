/** Human-facing view of an existing Agent memory; content is kept verbatim. */
export interface AgentMemoryRecord {
  id: string;
  category: string;
  content: string;
  source_conversation_id: string | null;
  created_at: string;
  last_accessed: string | null;
}
