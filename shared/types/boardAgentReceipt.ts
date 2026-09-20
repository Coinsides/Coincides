export interface BoardAgentLayoutReceipt {
  board_id: string;
  batch_id: string;
  /** Saved proposal geometry, including objects still in Staging. */
  report: {
    issues: Array<{ kind: string; severity: 'warning' | 'error'; itemIds: string[];
      coordinate: { x: number; y: number }; bounds: { x: number; y: number; w: number; h: number } }>;
    counts: Record<string, number>;
  } | null;
  diagnostic_error?: string;
}
