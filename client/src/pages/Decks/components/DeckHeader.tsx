import {
  ArrowLeft, Plus, LayoutGrid, List, Play, Sparkles,
  CheckSquare, FolderPlus,
} from 'lucide-react';
import styles from '../DeckDetail.module.css';

interface DeckHeaderProps {
  deckName: string;
  courseName?: string;
  courseColor?: string;
  view: 'grid' | 'list';
  setView: (v: 'grid' | 'list') => void;
  selectMode: boolean;
  selectedCount: number;
  dueCount: number;
  showNewSection: boolean;
  onBack: () => void;
  onToggleSelect: () => void;
  onToggleNewSection: () => void;
  onOpenAI: () => void;
  onAddCard: () => void;
  onReview: () => void;
  onReviewSelected: () => void;
}

export default function DeckHeader({
  deckName, courseName, courseColor,
  view, setView,
  selectMode, selectedCount, dueCount,
  showNewSection,
  onBack, onToggleSelect, onToggleNewSection,
  onOpenAI, onAddCard, onReview, onReviewSelected,
}: DeckHeaderProps) {
  return (
    <div className={styles.header}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={16} />
      </button>
      <div className={styles.headerInfo}>
        <div className={styles.deckName}>{deckName}</div>
        {courseName && courseColor && (
          <span
            className={styles.courseBadge}
            style={{ backgroundColor: courseColor + '18', color: courseColor }}
          >
            {courseName}
          </span>
        )}
      </div>
      <div className={styles.headerActions}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.active : ''}`}
            onClick={() => setView('grid')}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.active : ''}`}
            onClick={() => setView('list')}
          >
            <List size={14} />
          </button>
        </div>
        {selectMode && selectedCount > 0 ? (
          <button className={styles.reviewSelectedBtn} onClick={onReviewSelected}>
            <Play size={14} />
            Review Selected ({selectedCount})
          </button>
        ) : dueCount > 0 ? (
          <button className={styles.reviewBtn} onClick={onReview}>
            <Play size={14} />
            Review ({dueCount})
          </button>
        ) : null}
        <button
          className={`${styles.selectBtn} ${selectMode ? styles.selectBtnActive : ''}`}
          onClick={onToggleSelect}
          title="Select cards"
        >
          <CheckSquare size={14} />
        </button>
        <button
          className={styles.sectionAddBtn}
          onClick={onToggleNewSection}
          title="Add section"
        >
          <FolderPlus size={14} />
        </button>
        <button
          className={styles.aiBtn}
          onClick={onOpenAI}
          title="Ask AI to help with this deck"
        >
          <Sparkles size={14} />
        </button>
        <button
          className={styles.addBtn}
          onClick={onAddCard}
        >
          <Plus size={14} />
          Add Card
        </button>
      </div>
    </div>
  );
}
