import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, LayoutGrid, List, Search, Play, Star, X, Sparkles,
  CheckSquare, Trash2, FolderInput, ChevronDown, ChevronRight as ChevronRightIcon, FolderPlus,
  Edit2, Search as SearchIcon,
} from 'lucide-react';
import { useCardStore } from '@/stores/cardStore';
import { useDeckStore } from '@/stores/deckStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTagStore } from '@/stores/tagStore';
import { useReviewStore, type DueCard } from '@/stores/reviewStore';
import { useUIStore } from '@/stores/uiStore';
import { CardTemplateType } from '@shared/types';
import type { CardContent } from '@shared/types';
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

function getContentPreview(content: CardContent): string {
  if (!content) return '';
  if ('definition' in content) return content.definition || '';
  if ('statement' in content) return content.statement || '';
  if ('formula' in content) return content.formula || '';
  if ('body' in content) return content.body || '';
  return '';
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { cards, loading, fetchCards, batchDelete } = useCardStore();
  const decks = useDeckStore((s) => s.decks);
  const fetchDecks = useDeckStore((s) => s.fetchDecks);
  const { sections, fetchSections, createSection, updateSection, deleteSection } = useSectionStore();
  const courses = useCourseStore((s) => s.courses);
  const tags = useTagStore((s) => s.tags);
  const dueCount = useReviewStore((s) => s.dueCount);
  const fetchDueCount = useReviewStore((s) => s.fetchDueCount);
  const setCustomCards = useReviewStore((s) => s.setCustomCards);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [templateFilter, setTemplateFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [importanceFilter, setImportanceFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Batch select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Section collapse
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Section delete confirmation
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<{ id: string; name: string; cardCount: number } | null>(null);

  // Section inline rename
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Section search
  const [sectionSearchVisible, setSectionSearchVisible] = useState<Set<string>>(new Set());
  const [sectionSearches, setSectionSearches] = useState<Record<string, string>>({});

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
    fetchSections(deckId);
    loadCards();
  }, [deckId]);

  useEffect(() => {
    loadCards();
    setPage(1);
  }, [templateFilter, tagFilter, importanceFilter, search]);

  const totalPages = Math.ceil(cards.length / perPage);
  const paginatedCards = cards.slice((page - 1) * perPage, page * perPage);

  // Group cards by section
  const cardsBySection = useMemo(() => {
    const groups: Record<string, typeof cards> = { __unsectioned: [] };
    for (const s of sections) groups[s.id] = [];
    for (const card of paginatedCards) {
      const key = card.section_id && groups[card.section_id] ? card.section_id : '__unsectioned';
      groups[key].push(card);
    }
    return groups;
  }, [paginatedCards, sections]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  };

  const toggleSelect = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const count = await batchDelete([...selectedIds]);
      addToast('success', `Deleted ${count} cards`);
      setSelectedIds(new Set());
      setSelectMode(false);
      loadCards();
    } catch {
      addToast('error', 'Failed to delete cards');
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim() || !deckId) return;
    try {
      await createSection(deckId, newSectionName.trim(), sections.length);
      setNewSectionName('');
      setShowNewSection(false);
    } catch {
      addToast('error', 'Failed to create section');
    }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!confirmDeleteSection || !deckId) return;
    try {
      await deleteSection(confirmDeleteSection.id);
      addToast('success', `Deleted section and ${confirmDeleteSection.cardCount} cards`);
      setConfirmDeleteSection(null);
      loadCards();
      fetchDecks();
    } catch {
      addToast('error', 'Failed to delete section');
    }
  };

  const handleSectionRename = async (sectionId: string) => {
    if (!editingSectionName.trim()) {
      setEditingSectionId(null);
      return;
    }
    try {
      await updateSection(sectionId, { name: editingSectionName.trim() });
      setEditingSectionId(null);
    } catch {
      addToast('error', 'Failed to rename section');
    }
  };

  const toggleSectionSearch = (sectionId: string) => {
    setSectionSearchVisible((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
        setSectionSearches((s) => { const copy = { ...s }; delete copy[sectionId]; return copy; });
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const filterCardsBySearch = (cardList: typeof cards, sectionId: string) => {
    const q = (sectionSearches[sectionId] || '').toLowerCase();
    if (!q) return cardList;
    return cardList.filter((c) => c.title.toLowerCase().includes(q));
  };

  const handleReviewSelected = () => {
    if (selectedIds.size === 0 || !deck) return;
    const selectedCards = cards.filter((c) => selectedIds.has(c.id));
    const mapped: DueCard[] = selectedCards.map((c) => ({
      ...c,
      deck_name: deck.name,
      course_id: deck.course_id,
    }));
    setCustomCards(mapped);
    navigate('/review');
  };

  const renderCardGrid = (cardList: typeof cards) => {
    if (view === 'grid') {
      return (
        <div className={styles.cardGrid}>
          {cardList.map((card) => {
            const preview = getContentPreview(card.content);
            return (
              <div
                key={card.id}
                className={`${styles.gridCard} ${selectMode && selectedIds.has(card.id) ? styles.gridCardSelected : ''}`}
                onClick={() => selectMode ? toggleSelect(card.id) : openModal('card-view', { card, courseColor: course?.color })}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    className={styles.cardCheckbox}
                    checked={selectedIds.has(card.id)}
                    onChange={() => toggleSelect(card.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
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
                {preview && <div className={styles.gridCardPreview}>{preview}</div>}
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
          {selectMode && <span style={{ width: 28 }} />}
          <span className={styles.listColTitle}>Title</span>
          <span className={styles.listColType}>Type</span>
          <span className={styles.listColImportance}>Importance</span>
          <span className={styles.listColTags}>Tags</span>
          <span className={styles.listColDue}>Due</span>
        </div>
        {cardList.map((card) => (
          <div
            key={card.id}
            className={`${styles.listRow} ${selectMode && selectedIds.has(card.id) ? styles.listRowSelected : ''}`}
            onClick={() => selectMode ? toggleSelect(card.id) : openModal('card-view', { card, courseColor: course?.color })}
          >
            {selectMode && (
              <input
                type="checkbox"
                className={styles.cardCheckbox}
                checked={selectedIds.has(card.id)}
                onChange={() => toggleSelect(card.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className={styles.listColTitle}>{card.title}</span>
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
        ))}
      </div>
    );
  };

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
          {selectMode && selectedIds.size > 0 ? (
            <button className={styles.reviewSelectedBtn} onClick={handleReviewSelected}>
              <Play size={14} />
              Review Selected ({selectedIds.size})
            </button>
          ) : dueCount > 0 ? (
            <button className={styles.reviewBtn} onClick={() => navigate('/review')}>
              <Play size={14} />
              Review ({dueCount})
            </button>
          ) : null}
          <button
            className={`${styles.selectBtn} ${selectMode ? styles.selectBtnActive : ''}`}
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            title="Select cards"
          >
            <CheckSquare size={14} />
          </button>
          <button
            className={styles.sectionAddBtn}
            onClick={() => setShowNewSection(!showNewSection)}
            title="Add section"
          >
            <FolderPlus size={14} />
          </button>
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

      {/* New Section Input */}
      {showNewSection && (
        <div className={styles.newSectionRow}>
          <input
            className={styles.newSectionInput}
            placeholder="Section name..."
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
            autoFocus
          />
          <button className={styles.newSectionSave} onClick={handleAddSection}>Add</button>
          <button className={styles.newSectionCancel} onClick={() => { setShowNewSection(false); setNewSectionName(''); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      {loading && cards.length === 0 ? (
        <div className={styles.loading}>Loading cards...</div>
      ) : cards.length === 0 ? (
        <div className={styles.empty}>
          <h3>No cards in this deck</h3>
          <p>Add your first flashcard to start studying.</p>
        </div>
      ) : (
        <>
          {/* Render sections + unsectioned cards */}
          {sections.map((section) => {
            const sectionCards = cardsBySection[section.id] || [];
            const filteredCards = filterCardsBySearch(sectionCards, section.id);
            const collapsed = collapsedSections.has(section.id);
            return (
              <div key={section.id} className={styles.sectionGroup}>
                <div className={styles.sectionHeader} onClick={() => toggleSection(section.id)}>
                  {collapsed ? <ChevronRightIcon size={14} /> : <ChevronDown size={14} />}
                  {editingSectionId === section.id ? (
                    <input
                      className={styles.sectionNameInput}
                      value={editingSectionName}
                      onChange={(e) => setEditingSectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSectionRename(section.id);
                        if (e.key === 'Escape') setEditingSectionId(null);
                      }}
                      onBlur={() => handleSectionRename(section.id)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.sectionName}>{section.name}</span>
                  )}
                  <div className={styles.sectionActions}>
                    <button
                      className={styles.sectionActionBtn}
                      onClick={(e) => { e.stopPropagation(); setEditingSectionId(section.id); setEditingSectionName(section.name); }}
                      title="Rename section"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className={styles.sectionActionBtn}
                      onClick={(e) => { e.stopPropagation(); toggleSectionSearch(section.id); }}
                      title="Search in section"
                    >
                      <SearchIcon size={12} />
                    </button>
                    <button
                      className={`${styles.sectionActionBtn} ${styles.danger}`}
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteSection({ id: section.id, name: section.name, cardCount: sectionCards.length }); }}
                      title="Delete section"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <span className={styles.sectionCount}>{filteredCards.length}</span>
                </div>
                {sectionSearchVisible.has(section.id) && (
                  <div className={styles.sectionSearchRow}>
                    <input
                      className={styles.sectionSearchInput}
                      placeholder="Search in section..."
                      value={sectionSearches[section.id] || ''}
                      onChange={(e) => setSectionSearches((s) => ({ ...s, [section.id]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                )}
                {!collapsed && filteredCards.length > 0 && renderCardGrid(filteredCards)}
              </div>
            );
          })}

          {/* Unsectioned cards */}
          {(cardsBySection.__unsectioned?.length ?? 0) > 0 && (() => {
            const unsectionedFiltered = filterCardsBySearch(cardsBySection.__unsectioned, '__unsectioned');
            return (
              <div className={styles.sectionGroup}>
                {sections.length > 0 && (
                  <>
                    <div className={styles.sectionHeader} onClick={() => toggleSectionSearch('__unsectioned')}>
                      <span className={styles.sectionName}>Unsectioned</span>
                      <div className={styles.sectionActions}>
                        <button
                          className={styles.sectionActionBtn}
                          onClick={(e) => { e.stopPropagation(); toggleSectionSearch('__unsectioned'); }}
                          title="Search in section"
                        >
                          <SearchIcon size={12} />
                        </button>
                      </div>
                      <span className={styles.sectionCount}>{unsectionedFiltered.length}</span>
                    </div>
                    {sectionSearchVisible.has('__unsectioned') && (
                      <div className={styles.sectionSearchRow}>
                        <input
                          className={styles.sectionSearchInput}
                          placeholder="Search in section..."
                          value={sectionSearches['__unsectioned'] || ''}
                          onChange={(e) => setSectionSearches((s) => ({ ...s, '__unsectioned': e.target.value }))}
                          autoFocus
                        />
                      </div>
                    )}
                  </>
                )}
                {unsectionedFiltered.length > 0 && renderCardGrid(unsectionedFiltered)}
              </div>
            );
          })()}
        </>
      )}

      {/* Batch action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className={styles.batchBar}>
          <span className={styles.batchCount}>{selectedIds.size} selected</span>
          <button className={styles.batchDeleteBtn} onClick={handleBatchDelete}>
            <Trash2 size={14} />
            Delete
          </button>
          <button className={styles.batchCancelBtn} onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
            Cancel
          </button>
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

      {/* Section delete confirmation modal */}
      {confirmDeleteSection && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteSection(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Delete Section</div>
            <div className={styles.confirmMessage}>
              Delete section &lsquo;{confirmDeleteSection.name}&rsquo;? All {confirmDeleteSection.cardCount} card{confirmDeleteSection.cardCount !== 1 ? 's' : ''} in this section will be permanently deleted.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setConfirmDeleteSection(null)}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDeleteSectionConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
