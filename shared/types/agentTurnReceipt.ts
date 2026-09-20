export interface AgentReceiptCall {
  name: string;
  ok: boolean;
}

/** Read-time projection of persisted calls/results; never stored in a new column. */
export interface AgentTurnReceipt {
  board_layout_reports?: import('./boardAgentReceipt.js').BoardAgentLayoutReceipt[];
  write_calls: AgentReceiptCall[];
  read_calls: AgentReceiptCall[];
  write_ok_count: number;
  write_fail_count: number;
  /** Only present for historical/invalid names outside today's closed classification. */
  unclassified_calls?: AgentReceiptCall[];
}
