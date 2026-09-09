import { useEffect, useState } from 'react';
import type { ItemSummary } from '@shared/types/itemSummary';
import { itemOriginLabel, itemSummaryPreview, loadItemSummaries } from '@/services/itemSummaryReader';
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
    <div className={styles.origin}>Referenced item · {item ? itemOriginLabel(item) : 'Birthplace unavailable'}</div>
    <p className={styles.summary} role={loaded?.failed ? 'status' : undefined}>
      {!loaded ? 'Loading item…' : loaded.failed ? 'Item could not be loaded. Reopen the note to retry.'
        : itemSummaryPreview(itemId, item ? new Map([[itemId, item]]) : undefined)}
    </p>
  </div>;
}
