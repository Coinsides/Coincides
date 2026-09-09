import { useEffect, useState } from 'react';
import type { ItemSummary } from '@shared/types/itemSummary';
import { loadItemSummaries } from '@/services/itemSummaryReader';
import { ReferenceTag } from '@/components/ReferenceTag/ReferenceTag';
import styles from './ItemRefBlockProjection.module.css';

/** Only the identity lives in the block. Every mount rereads current Item truth. */
export function ItemRefBlockProjection({ itemId }: { itemId: string }) {
  const [read, setRead] = useState<{ id: string; item?: ItemSummary; failed?: boolean } | null>(null);
  useEffect(() => {
    let current = true;
    setRead(null);
    void loadItemSummaries([itemId]).then((items) => {
      if (current) setRead({ id: itemId, item: items.get(itemId) });
    }).catch(() => {
      if (current) setRead({ id: itemId, failed: true });
    });
    return () => { current = false; };
  }, [itemId]);
  const loaded = read?.id === itemId ? read : null;
  const item = loaded?.item;
  return <div className={styles.reference} data-item-ref={itemId}>
    <div className={styles.origin}><ReferenceTag noteId={item?.origin_note_id}
      originBoardTitle={item?.origin_board_title} retired={item?.status === 'retired'}
      health={!item || (!item.origin_note_id && !item.origin_board_id) ? 'lost' : item.status === 'retired' ? 'drifted' : 'active'} /></div>
    <p className={styles.summary} role={loaded?.failed ? 'status' : undefined}>
      {!loaded ? 'Loading item…' : loaded.failed ? 'Item could not be loaded. Reopen the note to retry.'
        : item ? item.plain_text ?? item.summary : 'Item unavailable'}
    </p>
  </div>;
}
