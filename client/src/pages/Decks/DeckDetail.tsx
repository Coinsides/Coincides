import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, LayoutGrid, List, Search, Play, Star, X, Sparkles,
} from 'lucide-react';
import { useCardStore } from '@/stores/cardStore';
import { useDeckStore } from '@/stores/deckStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTagStore } from '@/stores/tagStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useUIStore } from '@/stores/uiStore';
import { CardTemplateType } from '@shared/types';
import styles from './DeckDetail.module.css';

const templateOptions = [
  { value: '', label: 'All types' },
  { value: CardTemplateType.Definition, label: 'Definition' },
  { value: CardTemplateType.Theorem, label: 'Theorem' },
  { value: CardTemplateType.Formula, label: 'Formula' },
  { value: CardTemplateType.General, label: 'General' },
];

const templateColors: Record<string, string> = {
  [CardTemplateType.Definition]: '#6366f1',
  [CardTemplateType.Theorem]: '#f59e0b',
  [CardTemplateType.Formula]: '#22c55e',
  [CardTemplateType.General]: '#8b5cf6',
};

const templateLabels: Record<string, string> = {
  [CardTemplateType.Definition]: 'DEF',
  [CardTemplateType.Theorem]: 'THM',
  [CardTemplateType.Formula]: 'FML',
  [CardTemplateType.General]: 'GEN',
};

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { cards, loading, fetchCards } = useCardStore();
  const decks = useDeckStore((s) => s.decks);
  const fetchDecks = useDeckStore((s) => s.fetchDecks);
  const courses = useCourseStore((s) => s.courses);
  const tags = useTagStore((s) => s.tags);
  const dueCount = useReviewStore((s) => s.dueCount);
  const fetchDueCount = useReviewStore((s) => s.fetchDueCount);
  const openModal = useUIStore((s) => s.openModal);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [templateFilter, setTemplateFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [importanceFilter, setImportanceFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const deck = decks.find((d) => d.id === deckId);
  const course = deck ? courses.find((c) => c.id === deck.course_id) : null;

  const loadCards = useCallback(() => {
    if (!deckId) return;
    fetchCards(deckId, {
      template_type: templateFilter || undefined,
      tag_id: tagFilter || undefined,
      importance: importanceFilter || undefined,
      search: search || undefined,
    });
  }, [deckId, templateFilter, tagFilter, importanceFilter, search]);

  useEffect(() => {
    if (!deckId) return;
    if (decks.length === 0) fetchDecks();
    fetchDueCount();
    loadCards();
  }, [deckId]);

  useEffect(() => {
    loadCards();
    setPage(1);
  }, [templateFilter, tagFilter, importanceFilter, search]);

  const totalPages = Math.ceil(cards.length / perPage);
  const paginatedCards = cards.slice((page - 1) * perPage, page * perPage);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/decks')}>
          <ArrowLeft size={16} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.deckName}>{deck?.name || 'Deck'}</div>
          {course && (
            <span
              className={styles.courseBadge}
              style={{ backgroundColor: course.color + '18', color: course.color }}
            >
              {course.code || course.name}
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
          {dueCount > 0 && (
            <button className={styles.reviewBtn} onClick={() => navigate('/review')}>
              <Play size={14} />
              Review ({dueCount})
            </button>
          )}
          <button
            className={styles.aiBtn}
            onClick={() => openAgentWithContext('deck', { deck_id: deckId, deck_name: deck?.name })}
            title="Ask AI to help with this deck"
          >
            <Sparkles size={14} />
          </button>
          <button
            className={styles.addBtn}
            onClick={() => openModal('card-create', { deckId })}
          >
            <Plus size={14} />
            Add Card
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className={styles.pills}>
          {templateOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.pill} ${templateFilter === opt.value ? styles.activePill : ''}`}
              onClick={() => setTemplateFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          className={styles.filterSelect}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={importanceFilter}
          onChange={(e) => setImportanceFilter(Number(e.target.value))}
        >
          <option value={0}>Any importance</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{'★'.repeat(n)}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading && cards.length === 0 ? (
        <div className={styles.loading}>Loading cards...</div>
      ) : cards.length === 0 ? (
        <div className={styles.empty}>
          <h3>No cards in this deck</h3>
          <p>Add your first flashcard to start studying.</p>
        </div>
      ) : view === 'grid' ? (
        <div className={styles.cardGrid}>
          {paginatedCards.map((card) => (
            <div
              key={card.id}
              className={styles.gridCard}
              onClick={() => openModal('card-view', { card, courseColor: course?.color })}
            >
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
                    <Star
                      key={i}
                      size={10}
                      fill={i < card.importance ? '#f59e0b' : 'none'}
                      color={i < card.importance ? '#f59e0b' : 'var(--text-muted)'}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.gridCardTitle}>{card.title}</div>
              {card.tags && card.tags.length > 0 && (
                <div className={styles.gridCardTags}>
                  {card.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={styles.tag}
                      style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.listView}>
          <div className={styles.listHeader}>
            <span className={styles.listColTitle}>Title</span>
            <span className={styles.listColType}>Type</span>
            <span className={styles.listColImportance}>Importance</span>
            <span className={styles.listColTags}>Tags</span>
            <span className={styles.listColDue}>Due</span>
          </div>
          {paginatedCards.map((card) => (
            <div
              key={card.id}
              className={styles.listRow}
              onClick={() => openModal('card-view', { card, courseColor: course?.color })}
            >
              <span className={styles.listColTitle}>{card.title}</span>
              <span className={styles.listColType}>
                <span
                  className={styles.templateBadgeSm}
                  style={{
                    backgroundColor: (templateColors[card.template_type] || '#8b5cf6') + '20',
                    color: templateColors[card.template_type] || '#8b5cf6',
                  }}
                >
                  {templateLabels[card.template_type] || 'GEN'}
                </span>
              </span>
              <span className={styles.listColImportance}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={10}
                    fill={i < card.importance ? '#f59e0b' : 'none'}
                    color={i < card.importance ? '#f59e0b' : 'var(--text-muted)'}
                  />
                ))}
              </span>
              <span className={styles.listColTags}>
                {card.tags?.map((t) => t.name).join(', ') || '—'}
              </span>
              <span className={styles.listColDue}>
                {card.fsrs_reps === 0
                  ? 'New'
                  : card.fsrs_next_review
                    ? new Date(card.fsrs_next_review).toLocaleDateString()
                    : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${styles.pageBtn} ${page === i + 1 ? styles.activePageBtn : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
