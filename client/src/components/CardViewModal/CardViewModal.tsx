import { Pencil, Trash2 } from 'lucide-react';
import { useCardStore } from '@/stores/cardStore';
import { useUIStore } from '@/stores/uiStore';
import CardFlip from '@/components/CardFlip/CardFlip';
import type { Card } from '@shared/types';
import styles from './CardViewModal.module.css';

export default function CardViewModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const deleteCard = useCardStore((s) => s.deleteCard);

  const card = modal?.data?.card as (Card & { tags?: { id: string; name: string; color: string | null }[] }) | undefined;
  const courseColor = modal?.data?.courseColor as string | undefined;

  if (!card) return null;

  const handleEdit = () => {
    closeModal();
    setTimeout(() => openModal('card-edit', { card }), 100);
  };

  const handleDelete = async () => {
    try {
      await deleteCard(card.id);
      addToast('success', 'Card deleted');
      closeModal();
    } catch (err) {
      console.error('Failed to delete card:', err);
      addToast('error', 'Failed to delete card');
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.cardWrapper}>
          <CardFlip card={card} courseColor={courseColor} />
        </div>

        <div className={styles.meta}>
          {card.fsrs_reps > 0 && (
            <>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Reviews:</span>
                <span className={styles.metaValue}>{card.fsrs_reps}</span>
              </div>
              {card.fsrs_last_review && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Last review:</span>
                  <span className={styles.metaValue}>
                    {new Date(card.fsrs_last_review).toLocaleDateString()}
                  </span>
                </div>
              )}
              {card.fsrs_next_review && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Next review:</span>
                  <span className={styles.metaValue}>
                    {new Date(card.fsrs_next_review).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Created:</span>
            <span className={styles.metaValue}>
              {new Date(card.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={handleEdit}>
            <Pencil size={14} />
            Edit
          </button>
          <button className={styles.deleteBtn} onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
