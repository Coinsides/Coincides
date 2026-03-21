import { useUIStore } from '@/stores/uiStore';
import styles from './CardBubble.module.css';

export interface CardBubbleData {
  id: string;
  card_id: string;
  card_title: string;
  template_type: string;
  deck_id: string;
  deck_name: string;
}

interface CardBubbleProps {
  card: CardBubbleData;
  /** Compact inline tag mode (for checklist items) */
  compact?: boolean;
}

export default function CardBubble({ card, compact }: CardBubbleProps) {
  const openModal = useUIStore((s) => s.openModal);

  const handleClick = () => {
    openModal('card-view', { cardId: card.card_id });
  };

  if (compact) {
    return (
      <button
        className={styles.tag}
        onClick={handleClick}
        title={`${card.card_title} (${card.deck_name})`}
      >
        📝 {card.card_title.length > 15 ? card.card_title.slice(0, 15) + '…' : card.card_title}
      </button>
    );
  }

  return (
    <button className={styles.bubble} onClick={handleClick}>
      <span className={styles.bubbleTitle}>{card.card_title}</span>
      <span className={styles.bubbleMeta}>
        <span className={styles.templateBadge}>{card.template_type}</span>
        <span>{card.deck_name}</span>
      </span>
    </button>
  );
}
