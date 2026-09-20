import type { NoteSelection } from '../../../shared/types/agentContextHint.js';
import { readNoteForAgent } from '../services/agentReadSurfaces.js';

export const ATTENTION_CONTEXT_LIMITS = { blocks: 32, pages: 8, characters: 16000 } as const;

/** Compose only the existing read_note projection; no additional reader/tool. */
export function readAttentionContext(userId: string, selection: NoteSelection, preferredPage = 0) {
  const wanted = new Set(selection.block_ids);
  const blocks: ReturnType<typeof readNoteForAgent>['blocks'] = [];
  const first = readNoteForAgent({ userId, noteId: selection.note_id, pageIndex: preferredPage });
  const pages = [preferredPage, ...Array.from({ length: first.note.page_count }, (_, i) => i).filter(i => i !== preferredPage)]
    .slice(0, ATTENTION_CONTEXT_LIMITS.pages);
  for (const page of pages) {
    const projection = page === preferredPage ? first : readNoteForAgent({ userId, noteId: selection.note_id, pageIndex: page });
    for (const block of projection.blocks) if (wanted.has(block.id) && !blocks.some(existing => existing.id === block.id)) blocks.push(block);
    if (blocks.length === wanted.size) break;
  }
  const serialized = JSON.stringify({ note: first.note, selection, blocks });
  return { note: first.note, blocks,
    prompt: serialized.slice(0, ATTENTION_CONTEXT_LIMITS.characters),
    truncated: serialized.length > ATTENTION_CONTEXT_LIMITS.characters || blocks.length !== wanted.size,
    missing_block_ids: selection.block_ids.filter(id => !blocks.some(block => block.id === id)),
  };
}
