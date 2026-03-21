import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCardStore } from '@/stores/cardStore';
import { useDeckStore } from '@/stores/deckStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTagStore } from '@/stores/tagStore';
import { useReviewStore, type DueCard } from '@/stores/reviewStore';
import { useUIStore } from '@/stores/uiStore';

import DeckHeader from './components/DeckHeader';
import FilterBar from './components/FilterBar';
import SectionList from './components/SectionList';
import BatchBar from './components/BatchBar';
import ConfirmDialog from './components/ConfirmDialog';
import useDeckDragDrop from './components/useDeckDragDrop';
import styles from './DeckDetail.module.css';

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const { cards, loading, fetchCards, batchDelete, reorderCards } = useCardStore();
  const decks = useDeckStore((s) => s.decks);
  const fetchDecks = useDeckStore((s) => s.fetchDecks);
  const { sections, fetchSections, createSection, updateSection, deleteSection, reorderSections } = useSectionStore();
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
  // No pagination — show all cards (infinite scroll feel)

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<{ id: string; name: string; cardCount: number } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [sectionSearchVisible, setSectionSearchVisible] = useState<Set<string>>(new Set());
  const [sectionSearches, setSectionSearches] = useState<Record<string, string>>({});

  const deck = decks.find((d) => d.id === deckId);
  const course = deck ? courses.find((c) => c.id === deck.course_id) : null;

  const {
    dragType, dragId, dropTarget, dropSectionHighlight,
    clearDragState,
    handleSectionDragStart, handleSectionDragOver, handleSectionDrop,
    handleCardDragStart, handleCardDragOver, handleCardDrop,
    handleUnsectionedDragOver, handleUnsectionedDrop,
    setDropTarget, setDropSectionHighlight,
  } = useDeckDragDrop({
    deckId, cards, sections, view, selectMode, editingSectionId,
    reorderCards, reorderSections, fetchCards, fetchSections, addToast,
  });

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

  useEffect(() => { loadCards(); }, [templateFilter, tagFilter, importanceFilter, search]);



  const cardsBySection = useMemo(() => {
    const groups: Record<string, typeof cards> = { __unsectioned: [] };
    for (const s of sections) groups[s.id] = [];
    for (const card of cards) {
      const key = card.section_id && groups[card.section_id] ? card.section_id : '__unsectioned';
      groups[key].push(card);
    }
    return groups;
  }, [cards, sections]);

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
      setSelectedIds(new Set()); setSelectMode(false); loadCards();
    } catch (err) { console.error('Failed to delete cards:', err); addToast('error', 'Failed to delete cards'); }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim() || !deckId) return;
    try {
      await createSection(deckId, newSectionName.trim(), sections.length);
      setNewSectionName(''); setShowNewSection(false);
    } catch (err) { console.error('Failed to create section:', err); addToast('error', 'Failed to create section'); }
  };

  const handleDeleteSectionConfirm = async () => {
    if (!confirmDeleteSection || !deckId) return;
    try {
      await deleteSection(confirmDeleteSection.id);
      addToast('success', `Deleted section and ${confirmDeleteSection.cardCount} cards`);
      setConfirmDeleteSection(null); loadCards(); fetchDecks();
    } catch (err) { console.error('Failed to delete section:', err); addToast('error', 'Failed to delete section'); }
  };

  const handleSectionRename = async (sectionId: string) => {
    if (!editingSectionName.trim()) { setEditingSectionId(null); return; }
    try { await updateSection(sectionId, { name: editingSectionName.trim() }); setEditingSectionId(null); }
    catch (err) { console.error('Failed to rename section:', err); addToast('error', 'Failed to rename section'); }
  };

  const toggleSectionSearch = (sectionId: string) => {
    setSectionSearchVisible((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
        setSectionSearches((s) => { const copy = { ...s }; delete copy[sectionId]; return copy; });
      } else { next.add(sectionId); }
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
    const mapped: DueCard[] = cards.filter((c) => selectedIds.has(c.id)).map((c) => ({
      ...c, deck_name: deck.name, course_id: deck.course_id,
    }));
    setCustomCards(mapped); navigate('/review');
  };

  return (
    <div className={styles.page}>
      <DeckHeader
        deckName={deck?.name || 'Deck'}
        courseName={course ? (course.code || course.name) : undefined}
        courseColor={course?.color}
        view={view} setView={setView}
        selectMode={selectMode} selectedCount={selectedIds.size}
        dueCount={dueCount} showNewSection={showNewSection}
        onBack={() => navigate('/decks')}
        onToggleSelect={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
        onToggleNewSection={() => setShowNewSection(!showNewSection)}
        onOpenAI={() => openAgentWithContext('deck', { deck_id: deckId, deck_name: deck?.name })}
        onAddCard={() => openModal('card-create', { deckId })}
        onReview={() => navigate('/review')}
        onReviewSelected={handleReviewSelected}
      />

      <FilterBar
        search={search} setSearch={setSearch}
        templateFilter={templateFilter} setTemplateFilter={setTemplateFilter}
        tagFilter={tagFilter} setTagFilter={setTagFilter}
        importanceFilter={importanceFilter} setImportanceFilter={setImportanceFilter}
        tags={tags}
      />

      {loading && cards.length === 0 ? (
        <div className={styles.loading}>Loading cards...</div>
      ) : cards.length === 0 ? (
        <div className={styles.empty}>
          <h3>No cards in this deck</h3>
          <p>Add your first flashcard to start studying.</p>
        </div>
      ) : (
        <SectionList
          sections={sections} cardsBySection={cardsBySection}
          collapsedSections={collapsedSections}
          sectionSearchVisible={sectionSearchVisible} sectionSearches={sectionSearches}
          editingSectionId={editingSectionId} editingSectionName={editingSectionName}
          showNewSection={showNewSection} newSectionName={newSectionName}
          view={view} selectMode={selectMode} selectedIds={selectedIds} courseColor={course?.color}
          dragType={dragType} dragId={dragId} dropTarget={dropTarget} dropSectionHighlight={dropSectionHighlight}
          onToggleSection={toggleSection}
          onEditSection={(id, name) => { setEditingSectionId(id); setEditingSectionName(name); }}
          onSetEditingSectionName={setEditingSectionName}
          onSectionRename={handleSectionRename}
          onCancelEditSection={() => setEditingSectionId(null)}
          onToggleSectionSearch={toggleSectionSearch}
          onSetSectionSearch={(id, q) => setSectionSearches((s) => ({ ...s, [id]: q }))}
          onDeleteSection={setConfirmDeleteSection}
          onSetNewSectionName={setNewSectionName}
          onAddSection={handleAddSection}
          onCancelNewSection={() => { setShowNewSection(false); setNewSectionName(''); }}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragOver={handleSectionDragOver}
          onSectionDragLeave={() => { setDropTarget(null); setDropSectionHighlight(null); }}
          onSectionDrop={handleSectionDrop}
          onDragEnd={clearDragState}
          onToggleSelect={toggleSelect}
          onCardClick={(card) => openModal('card-view', { card, courseColor: course?.color })}
          onCardDragStart={handleCardDragStart}
          onCardDragOver={handleCardDragOver}
          onCardDragLeave={() => setDropTarget(null)}
          onCardDrop={handleCardDrop}
          onUnsectionedDragOver={handleUnsectionedDragOver}
          onUnsectionedDrop={handleUnsectionedDrop}
          onUnsectionedDragLeave={() => setDropSectionHighlight(null)}
          filterCardsBySearch={filterCardsBySearch}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <BatchBar selectedCount={selectedIds.size} onDelete={handleBatchDelete} onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }} />
      )}



      {confirmDeleteSection && (
        <ConfirmDialog
          title="Delete Section"
          message={`Delete section '${confirmDeleteSection.name}'? All ${confirmDeleteSection.cardCount} card${confirmDeleteSection.cardCount !== 1 ? 's' : ''} in this section will be permanently deleted.`}
          onConfirm={handleDeleteSectionConfirm}
          onCancel={() => setConfirmDeleteSection(null)}
        />
      )}
    </div>
  );
}
