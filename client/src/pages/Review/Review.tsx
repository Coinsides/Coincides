import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Layers, BookOpen, FolderOpen, Tag, CheckSquare, ChevronRight } from 'lucide-react';
import { useReviewStore } from '@/stores/reviewStore';
import type { ReviewFilters, BrowseTree } from '@/stores/reviewStore';
import { useDeckStore } from '@/stores/deckStore';
import { useTagStore } from '@/stores/tagStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useUIStore } from '@/stores/uiStore';
import CardFlip from '@/components/CardFlip/CardFlip';
import styles from './Review.module.css';

const ratingConfig = [
  { value: 1, label: 'Again', color: '#ef4444' },
  { value: 2, label: 'Hard', color: '#f59e0b' },
  { value: 3, label: 'Good', color: '#22c55e' },
  { value: 4, label: 'Easy', color: '#3b82f6' },
];

type ReviewMode = 'all' | 'deck' | 'section' | 'tag' | 'custom';

export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    dueCards, currentIndex, sessionActive, sessionResults,
    loading, fetchDueCards, rateCard, startSession, nextCard, endSession,
    browseTree, fetchBrowseTree, startCustomSession,
  } = useReviewStore();
  const addToast = useUIStore((s) => s.addToast);

  const decks = useDeckStore((s) => s.decks);
  const fetchDecks = useDeckStore((s) => s.fetchDecks);
  const tags = useTagStore((s) => s.tags);
  const fetchTags = useTagStore((s) => s.fetchTags);
  const sections = useSectionStore((s) => s.sections);
  const fetchSections = useSectionStore((s) => s.fetchSections);

  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);
  const [showSelector, setShowSelector] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ReviewMode>('all');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Check for URL params (quick-entry from DeckDetail)
  useEffect(() => {
    const deckId = searchParams.get('deckId');
    const sectionId = searchParams.get('sectionId');
    const tagId = searchParams.get('tagId');

    if (deckId || sectionId || tagId) {
      const filters: ReviewFilters = {};
      if (deckId) filters.deckId = deckId;
      if (sectionId) filters.sectionId = sectionId;
      if (tagId) filters.tagId = tagId;
      setShowSelector(false);
      fetchDueCards(filters).then(() => {
        startSession();
      });
    } else {
      // Load data for selector dropdowns
      fetchDecks();
      fetchTags();
    }
  }, []);

  // When deck changes, load its sections
  useEffect(() => {
    if (selectedDeckId) {
      fetchSections(selectedDeckId);
    }
  }, [selectedDeckId]);

  const handleStartReview = () => {
    if (selectedMode === 'custom') {
      if (selectedCardIds.size === 0) return;
      setShowSelector(false);
      startCustomSession(Array.from(selectedCardIds));
      return;
    }
    const filters: ReviewFilters = {};
    if (selectedMode === 'deck' && selectedDeckId) {
      filters.deckId = selectedDeckId;
    } else if (selectedMode === 'section' && selectedSectionId) {
      filters.sectionId = selectedSectionId;
    } else if (selectedMode === 'tag' && selectedTagId) {
      filters.tagId = selectedTagId;
    }
    setShowSelector(false);
    fetchDueCards(Object.keys(filters).length > 0 ? filters : undefined).then(() => {
      startSession();
    });
  };

  const canStart = selectedMode === 'all'
    || (selectedMode === 'deck' && selectedDeckId)
    || (selectedMode === 'section' && selectedSectionId)
    || (selectedMode === 'tag' && selectedTagId)
    || (selectedMode === 'custom' && selectedCardIds.size > 0);

  const toggleCard = (id: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllInList = (cardIds: string[]) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      const allSelected = cardIds.every(id => next.has(id));
      if (allSelected) {
        cardIds.forEach(id => next.delete(id));
      } else {
        cardIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const getAllDeckCardIds = (deck: BrowseTree): string[] => {
    const ids: string[] = [];
    deck.unsectioned_cards.forEach(c => ids.push(c.id));
    deck.sections.forEach(s => s.cards.forEach(c => ids.push(c.id)));
    return ids;
  };

  const toggleDeckExpand = (id: string) => {
    setExpandedDecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSectionExpand = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isDue = (card: { fsrs_reps: number; fsrs_next_review: string | null }) => {
    if (card.fsrs_reps === 0) return true;
    if (!card.fsrs_next_review) return true;
    return new Date(card.fsrs_next_review) <= new Date();
  };

  const currentCard = dueCards[currentIndex];
  const isFinished = sessionActive && currentIndex >= dueCards.length;

  const handleRate = async (value: number) => {
    if (!currentCard) return;
    try {
      await rateCard(currentCard.id, value);
      setFlipped(false);
      setRating(false);
      if (currentIndex + 1 >= dueCards.length) {
        // Session done — show summary
      }
      nextCard();
    } catch (err) {
      console.error('Failed to rate card:', err);
      addToast('error', 'Failed to rate card');
    }
  };

  const handleFlip = (isFlipped: boolean) => {
    setFlipped(isFlipped);
    if (isFlipped) setRating(true);
  };

  const handleFinish = () => {
    endSession();
    navigate('/decks');
  };

  // Mode Selector
  if (showSelector) {
    return (
      <div className={styles.page}>
        <div className={styles.modeSelector}>
          <h2 className={styles.modeSelectorTitle}>Review Mode</h2>
          <p className={styles.modeSelectorSubtitle}>Choose which cards to review</p>

          <div className={styles.modeGrid}>
            <button
              className={`${styles.modeCard} ${selectedMode === 'all' ? styles.modeCardActive : ''}`}
              onClick={() => setSelectedMode('all')}
            >
              <Layers size={22} />
              <span>All Due Cards</span>
            </button>
            <button
              className={`${styles.modeCard} ${selectedMode === 'deck' ? styles.modeCardActive : ''}`}
              onClick={() => setSelectedMode('deck')}
            >
              <BookOpen size={22} />
              <span>By Deck</span>
            </button>
            <button
              className={`${styles.modeCard} ${selectedMode === 'section' ? styles.modeCardActive : ''}`}
              onClick={() => setSelectedMode('section')}
            >
              <FolderOpen size={22} />
              <span>By Section</span>
            </button>
            <button
              className={`${styles.modeCard} ${selectedMode === 'tag' ? styles.modeCardActive : ''}`}
              onClick={() => setSelectedMode('tag')}
            >
              <Tag size={22} />
              <span>By Tag</span>
            </button>
            <button
              className={`${styles.modeCard} ${selectedMode === 'custom' ? styles.modeCardActive : ''}`}
              onClick={() => { setSelectedMode('custom'); fetchBrowseTree(); }}
            >
              <CheckSquare size={22} />
              <span>Custom Selection</span>
            </button>
          </div>

          {selectedMode === 'deck' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterLabel}>Select a deck</label>
              <select
                className={styles.filterSelect}
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
              >
                <option value="">Choose deck...</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedMode === 'section' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterLabel}>Select a deck first</label>
              <select
                className={styles.filterSelect}
                value={selectedDeckId}
                onChange={(e) => { setSelectedDeckId(e.target.value); setSelectedSectionId(''); }}
              >
                <option value="">Choose deck...</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {selectedDeckId && (
                <>
                  <label className={styles.filterLabel}>Select a section</label>
                  <select
                    className={styles.filterSelect}
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    <option value="">Choose section...</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {selectedMode === 'tag' && (
            <div className={styles.filterDropdown}>
              <label className={styles.filterLabel}>Select a tag</label>
              <select
                className={styles.filterSelect}
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
              >
                <option value="">Choose tag...</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedMode === 'custom' && (
            <div className={styles.browseTree}>
              {browseTree.length === 0 ? (
                <div className={styles.browseEmpty}>No decks found.</div>
              ) : (
                browseTree.map(deck => {
                  const deckCardIds = getAllDeckCardIds(deck);
                  const deckAllSelected = deckCardIds.length > 0 && deckCardIds.every(id => selectedCardIds.has(id));
                  const deckSomeSelected = deckCardIds.some(id => selectedCardIds.has(id));
                  const isDeckExpanded = expandedDecks.has(deck.id);

                  return (
                    <div key={deck.id} className={styles.browseGroup}>
                      <div className={styles.browseDeckRow}>
                        <input
                          type="checkbox"
                          className={styles.browseCheckbox}
                          checked={deckAllSelected}
                          ref={el => { if (el) el.indeterminate = deckSomeSelected && !deckAllSelected; }}
                          onChange={() => toggleAllInList(deckCardIds)}
                        />
                        <div className={styles.browseDeckName} onClick={() => toggleDeckExpand(deck.id)}>
                          <ChevronRight size={14} className={`${styles.expandIcon} ${isDeckExpanded ? styles.expandIconOpen : ''}`} />
                          <BookOpen size={14} />
                          <span>{deck.name}</span>
                          <span className={styles.browseCount}>{deckCardIds.length} cards</span>
                        </div>
                      </div>

                      {isDeckExpanded && (
                        <div className={styles.browseDeckContent}>
                          {deck.unsectioned_cards.map(card => (
                            <label key={card.id} className={styles.browseCardRow}>
                              <input
                                type="checkbox"
                                className={styles.browseCheckbox}
                                checked={selectedCardIds.has(card.id)}
                                onChange={() => toggleCard(card.id)}
                              />
                              <span className={`${styles.dueIndicator} ${isDue(card) ? styles.dueIndicatorActive : ''}`} />
                              <span className={styles.browseCardTitle}>{card.title}</span>
                            </label>
                          ))}

                          {deck.sections.map(section => {
                            const sectionCardIds = section.cards.map(c => c.id);
                            const secAllSelected = sectionCardIds.length > 0 && sectionCardIds.every(id => selectedCardIds.has(id));
                            const secSomeSelected = sectionCardIds.some(id => selectedCardIds.has(id));
                            const isSectionExpanded = expandedSections.has(section.id);

                            return (
                              <div key={section.id} className={styles.browseSectionGroup}>
                                <div className={styles.browseSectionRow}>
                                  <input
                                    type="checkbox"
                                    className={styles.browseCheckbox}
                                    checked={secAllSelected}
                                    ref={el => { if (el) el.indeterminate = secSomeSelected && !secAllSelected; }}
                                    onChange={() => toggleAllInList(sectionCardIds)}
                                  />
                                  <div className={styles.browseSectionName} onClick={() => toggleSectionExpand(section.id)}>
                                    <ChevronRight size={12} className={`${styles.expandIcon} ${isSectionExpanded ? styles.expandIconOpen : ''}`} />
                                    <FolderOpen size={12} />
                                    <span>{section.name}</span>
                                    <span className={styles.browseCount}>{sectionCardIds.length}</span>
                                  </div>
                                </div>

                                {isSectionExpanded && section.cards.map(card => (
                                  <label key={card.id} className={styles.browseCardRow}>
                                    <input
                                      type="checkbox"
                                      className={styles.browseCheckbox}
                                      checked={selectedCardIds.has(card.id)}
                                      onChange={() => toggleCard(card.id)}
                                    />
                                    <span className={`${styles.dueIndicator} ${isDue(card) ? styles.dueIndicatorActive : ''}`} />
                                    <span className={styles.browseCardTitle}>{card.title}</span>
                                  </label>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {selectedCardIds.size > 0 && (
                <div className={styles.selectedCount}>{selectedCardIds.size} card{selectedCardIds.size !== 1 ? 's' : ''} selected</div>
              )}
            </div>
          )}

          <div className={styles.modeSelectorActions}>
            <button className={styles.backBtn} onClick={() => navigate('/decks')}>
              Back
            </button>
            <button
              className={styles.startBtn}
              onClick={handleStartReview}
              disabled={!canStart}
            >
              {selectedMode === 'custom' && selectedCardIds.size > 0
                ? `Start Review (${selectedCardIds.size} card${selectedCardIds.size !== 1 ? 's' : ''})`
                : 'Start Review'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && dueCards.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading review cards...</div>
      </div>
    );
  }

  if (!loading && dueCards.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <RotateCcw size={40} strokeWidth={1} />
          <h3>All caught up!</h3>
          <p>No cards are due for review right now.</p>
          <button className={styles.backBtn} onClick={() => navigate('/decks')}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // Session summary
  if (isFinished) {
    const ratingCounts = [0, 0, 0, 0, 0]; // index 1-4
    sessionResults.forEach((r) => { ratingCounts[r.rating]++; });

    return (
      <div className={styles.page}>
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Session Complete</h2>
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{sessionResults.length}</div>
              <div className={styles.statLabel}>Cards Reviewed</div>
            </div>
            {ratingConfig.map((rc) => (
              <div key={rc.value} className={styles.statCard}>
                <div className={styles.statValue} style={{ color: rc.color }}>
                  {ratingCounts[rc.value]}
                </div>
                <div className={styles.statLabel}>{rc.label}</div>
              </div>
            ))}
          </div>
          <button className={styles.finishBtn} onClick={handleFinish}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.navBackBtn} onClick={() => navigate('/decks')}>
          <ArrowLeft size={16} />
        </button>
        <div className={styles.progress}>
          <div className={styles.progressText}>
            Card {currentIndex + 1} of {dueCards.length}
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${((currentIndex) / dueCards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      {currentCard && (
        <div className={styles.cardArea}>
          <div className={styles.deckLabel}>{currentCard.deck_name}</div>
          <CardFlip
            card={currentCard}
            onFlip={handleFlip}
          />
        </div>
      )}

      {/* Rating buttons */}
      <div className={`${styles.ratingBar} ${rating ? styles.visible : ''}`}>
        {ratingConfig.map((rc) => (
          <button
            key={rc.value}
            className={styles.ratingBtn}
            style={{ backgroundColor: rc.color + '18', color: rc.color, borderColor: rc.color + '40' }}
            onClick={() => handleRate(rc.value)}
          >
            {rc.label}
          </button>
        ))}
      </div>

      {!flipped && (
        <div className={styles.flipPrompt}>Click the card to reveal the answer</div>
      )}
    </div>
  );
}
