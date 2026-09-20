export interface EpisodeMessageRange {
  first_message_id: string;
  last_message_id: string;
  started_at: string;
  ended_at: string;
}

export interface EpisodeAnchorManifest {
  note_ids: string[];
  board_ids: string[];
  item_ids: string[];
  proposal_ids: string[];
  memory_ids: string[];
}

/** Machine-generated conversation view; the original messages remain untouched. */
export interface AgentEpisodeRecord {
  id: string;
  conversation_id: string;
  conversation_title?: string | null;
  seq: number;
  summary_text: string;
  message_range: EpisodeMessageRange;
  anchor_manifest: EpisodeAnchorManifest;
  token_estimate: number;
  created_at: string;
}
