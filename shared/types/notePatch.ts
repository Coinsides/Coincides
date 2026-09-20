/** Agent authors only this proposal payload. The server freezes the review baseline. */
export interface NotePatchInput {
  note_id: string;
  patches: { block_id: string; unit_id?: string; new_text: string }[];
}

export interface NotePatchReview {
  block_id: string;
  unit_id: string;
  new_text: string;
  old_text: string;
  base_revision: number;
  base_hash: string;
  status: 'pending' | 'applied' | 'discarded' | 'stale';
}

export interface NotePatchProposalData {
  note_id: string;
  note_title: string;
  patches: NotePatchReview[];
}

/** Only the human text-save entry point accepts this acknowledgement. */
export interface NotePatchAcceptance { proposal_id: string; patch_index: number }
