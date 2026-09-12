import { ReferenceTag } from '@/components/ReferenceTag/ReferenceTag';
import type { BoardMember } from './boardTypes';

export function BoardReferenceTag({ member, noteTitle, onOpenSource }: {
  member: BoardMember; noteTitle?: string; onOpenSource?: () => void;
}) {
  const reference = member.reference;
  const range = member.member_kind === 'text_range';
  const health = range ? reference.anchor_status || 'lost'
    : reference.state === 'missing' || (!reference.note_id && !reference.origin_board_id) ? 'lost'
      : reference.reason === 'item_retired' ? 'drifted' : 'active';
  return <ReferenceTag noteId={reference.note_id} noteTitle={range ? reference.title : noteTitle}
    blockId={reference.block_id} startOffset={reference.start_offset} endOffset={reference.end_offset}
    originBoardTitle={reference.origin_board_title} health={health}
    retired={reference.item_status === 'retired'} onOpenSource={onOpenSource} />;
}
