import { useState } from 'react';
import { Star } from 'lucide-react';
import { CardTemplateType } from '@shared/types';
import type { Card, CardContent } from '@shared/types';
import CardTemplateContent from './CardTemplateContent';
import styles from './CardFlip.module.css';

interface CardFlipProps {
  card: Card & { tags?: { id: string; name: string; color: string | null }[] };
  courseColor?: string;
  onFlip?: (flipped: boolean) => void;
}

const templateLabels: Record<string, string> = {
  [CardTemplateType.Definition]: 'DEF',
  [CardTemplateType.Theorem]: 'THM',
  [CardTemplateType.Formula]: 'FML',
  [CardTemplateType.General]: 'GEN',
};

const templateColors: Record<string, string> = {
  [CardTemplateType.Definition]: '#6366f1',
  [CardTemplateType.Theorem]: '#f59e0b',
  [CardTemplateType.Formula]: '#22c55e',
  [CardTemplateType.General]: '#8b5cf6',
};

export default function CardFlip({ card, courseColor, onFlip }: CardFlipProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    onFlip?.(next);
  };

  return (
    <div className={styles.cardContainer} onClick={handleFlip}>
      <div className={`${styles.cardInner} ${flipped ? styles.flipped : ''}`}>
        {/* Front */}
        <div className={styles.cardFace}>
          <div className={styles.cardFront}>
            <div className={styles.cardTopRow}>
              <span
                className={styles.templateBadge}
                style={{ backgroundColor: templateColors[card.template_type] + '20', color: templateColors[card.template_type] }}
              >
                {templateLabels[card.template_type] || 'GEN'}
              </span>
              {courseColor && (
                <span className={styles.courseDot} style={{ backgroundColor: courseColor }} />
              )}
            </div>
            <div className={styles.cardTitle}>{card.title}</div>
            <div className={styles.cardBottom}>
              <div className={styles.stars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={i < card.importance ? '#f59e0b' : 'none'}
                    color={i < card.importance ? '#f59e0b' : 'var(--text-muted)'}
                  />
                ))}
              </div>
              <span className={styles.flipHint}>Click to flip</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div className={styles.cardBackContent}>
            <div className={styles.cardTopRow}>
              <span
                className={styles.templateBadge}
                style={{ backgroundColor: templateColors[card.template_type] + '20', color: templateColors[card.template_type] }}
              >
                {templateLabels[card.template_type] || 'GEN'}
              </span>
              <span className={styles.backTitle}>{card.title}</span>
            </div>
            <CardTemplateContent
              templateType={card.template_type}
              content={card.content as CardContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
