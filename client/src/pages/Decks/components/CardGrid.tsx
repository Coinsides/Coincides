import { Star, GripVertical } from 'lucide-react';
import { templateColors, templateLabels, getContentPreview } from './types';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import styles from '../DeckDetail.module.css';

interface CardTag {
  id: string;
  name: string;
  color?: string | null;
}

interface Card {
  id: string;
  title: string;
  template_type: string;
  importance: number;
  content: any;
  section_id: string | null;
  order_index: number | null;
  fsrs_reps: number;
  fsrs_next_review: string | null;
  tags?: CardTag[];
}

interface CardGridProps {
  cards: Card[];
  sectionId: string | null;
  view: 'grid' | 'list';
  selectMode: boolean;
  selectedIds: Set<string>;
  dragType: 'section' | 'card' | null;
  dragId: string | null;
  dropTarget: { id: string; position: 'before' | 'after' } | null;
  courseColor?: string;
  onToggleSelect: (cardId: string) => void;
  onCardClick: (card: Card) => void;
  onCardDragStart: (e: React.DragEvent, cardId: string) => void;
  onCardDragOver: (e: React.DragEvent, cardId: string) => void;
  onCardDragLeave: () => void;
  onCardDrop: (e: React.DragEvent, cardId: string, sectionId: string | null) => void;
  onDragEnd: () => void;
}

export default function CardGrid({
  cards, sectionId, view, selectMode, selectedIds,
  dragType, dragId, dropTarget, courseColor,
  onToggleSelect, onCardClick,
  onCardDragStart, onCardDragOver, onCardDragLeave, onCardDrop, onDragEnd,
}: CardGridProps) {
  const isDraggable = !selectMode;

  if (view === 'grid') {
    return (
      <div className={styles.cardGrid}>
        {cards.map((card) => {
          const preview = getContentPreview(card.content);
          const isDragged = dragType === 'card' && dragId === card.id;
          const isDropTarget = dropTarget?.id === card.id;
          const gridDropClass = isDropTarget
            ? (dropTarget.position === 'before' ? styles.cardDropBefore : styles.cardDropAfter)
            : '';
          return (
            <div
              key={card.id}
              className={`${styles.gridCard} ${selectMode && selectedIds.has(card.id) ? styles.gridCardSelected : ''} ${isDragged ? styles.cardDragging : ''} ${gridDropClass}`}
              draggable={isDraggable}
              onDragStart={(e) => onCardDragStart(e, card.id)}
              onDragOver={(e) => onCardDragOver(e, card.id)}
              onDragLeave={onCardDragLeave}
              onDrop={(e) => onCardDrop(e, card.id, sectionId)}
              onDragEnd={onDragEnd}
              onClick={() => selectMode ? onToggleSelect(card.id) : onCardClick(card)}
            >
              {selectMode ? (
                <input
                  type="checkbox"
                  className={styles.cardCheckbox}
                  checked={selectedIds.has(card.id)}
                  onChange={() => onToggleSelect(card.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className={styles.dragHandle} onMouseDown={(e) => e.stopPropagation()}>
                  <GripVertical size={14} />
                </div>
              )}
              <div className={styles.gridCardTop}>
                <span
                  className={styles.templateBadge}
                  style={{
                    backgroundColor: (templateColors[card.template_type] || '#8b5cf6') + '20',
                    color: templateColors[card.template_type] || '#8b5cf6',
                  }}
                >
                  {templateLabels[card.template_type] || 'GEN'}
                </span>
                <div className={styles.miniStars}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={10} fill={i < card.importance ? '#f59e0b' : 'none'} color={i < card.importance ? '#f59e0b' : 'var(--text-muted)'} />
                  ))}
                </div>
              </div>
              <div className={styles.gridCardTitle}>{card.title}</div>
              {preview && (
                <div className={styles.gridCardPreview}>
                  <KaTeXRenderer text={preview.length > 120 ? preview.slice(0, 120) + '…' : preview} />
                </div>
              )}
              {card.tags && card.tags.length > 0 && (
                <div className={styles.gridCardTags}>
                  {card.tags.map((tag) => (
                    <span key={tag.id} className={styles.tag} style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}>{tag.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.listView}>
      <div className={styles.listHeader}>
        {!selectMode && <span style={{ width: 22 }} />}
        {selectMode && <span style={{ width: 28 }} />}
        <span className={styles.listColTitle}>Title</span>
        <span className={styles.listColType}>Type</span>
        <span className={styles.listColImportance}>Importance</span>
        <span className={styles.listColTags}>Tags</span>
        <span className={styles.listColDue}>Due</span>
      </div>
      {cards.map((card) => {
        const isDragged = dragType === 'card' && dragId === card.id;
        const isDropTarget = dropTarget?.id === card.id;
        const listDropClass = isDropTarget
          ? (dropTarget.position === 'before' ? styles.listCardDropBefore : styles.listCardDropAfter)
          : '';
        return (
          <div
            key={card.id}
            className={`${styles.listRow} ${selectMode && selectedIds.has(card.id) ? styles.listRowSelected : ''} ${isDragged ? styles.cardDragging : ''} ${listDropClass}`}
            draggable={isDraggable}
            onDragStart={(e) => onCardDragStart(e, card.id)}
            onDragOver={(e) => onCardDragOver(e, card.id)}
            onDragLeave={onCardDragLeave}
            onDrop={(e) => onCardDrop(e, card.id, sectionId)}
            onDragEnd={onDragEnd}
            onClick={() => selectMode ? onToggleSelect(card.id) : onCardClick(card)}
          >
            {!selectMode && (
              <div className={styles.dragHandle} onMouseDown={(e) => e.stopPropagation()}>
                <GripVertical size={14} />
              </div>
            )}
            {selectMode && (
              <input
                type="checkbox"
                className={styles.cardCheckbox}
                checked={selectedIds.has(card.id)}
                onChange={() => onToggleSelect(card.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className={styles.listColTitle}>
              <div className={styles.listCardName}>{card.title}</div>
              {(() => { const p = getContentPreview(card.content); return p ? (
                <div className={styles.listCardPreview}>
                  <KaTeXRenderer text={p.length > 80 ? p.slice(0, 80) + '…' : p} />
                </div>
              ) : null; })()}
            </div>
            <span className={styles.listColType}>
              <span className={styles.templateBadgeSm} style={{ backgroundColor: (templateColors[card.template_type] || '#8b5cf6') + '20', color: templateColors[card.template_type] || '#8b5cf6' }}>
                {templateLabels[card.template_type] || 'GEN'}
              </span>
            </span>
            <span className={styles.listColImportance}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={10} fill={i < card.importance ? '#f59e0b' : 'none'} color={i < card.importance ? '#f59e0b' : 'var(--text-muted)'} />
              ))}
            </span>
            <span className={styles.listColTags}>{card.tags?.map((t) => t.name).join(', ') || '—'}</span>
            <span className={styles.listColDue}>
              {card.fsrs_reps === 0 ? 'New' : card.fsrs_next_review ? new Date(card.fsrs_next_review).toLocaleDateString() : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
