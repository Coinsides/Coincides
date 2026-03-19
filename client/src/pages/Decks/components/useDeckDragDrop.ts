import { useState } from 'react';

interface Card {
  id: string;
  section_id: string | null;
  order_index: number | null;
  [key: string]: any;
}

interface Section {
  id: string;
  [key: string]: any;
}

interface UseDeckDragDropOptions {
  deckId: string | undefined;
  cards: Card[];
  sections: Section[];
  view: 'grid' | 'list';
  selectMode: boolean;
  editingSectionId: string | null;
  reorderCards: (deckId: string, updates: any[]) => Promise<void>;
  reorderSections: (deckId: string, order: string[]) => Promise<void>;
  fetchCards: (deckId: string) => void;
  fetchSections: (deckId: string) => void;
  addToast: (type: string, msg: string) => void;
}

export default function useDeckDragDrop({
  deckId, cards, sections, view, selectMode, editingSectionId,
  reorderCards, reorderSections, fetchCards, fetchSections, addToast,
}: UseDeckDragDropOptions) {
  const [dragType, setDragType] = useState<'section' | 'card' | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const [dropSectionHighlight, setDropSectionHighlight] = useState<string | null>(null);

  const clearDragState = () => {
    setDragType(null); setDragId(null); setDropTarget(null); setDropSectionHighlight(null);
  };

  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    if (editingSectionId === sectionId) { e.preventDefault(); return; }
    setDragType('section'); setDragId(sectionId);
    e.dataTransfer.setData('text/plain', sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (dragType !== 'section' && dragType !== 'card') return;
    if (dragType === 'section') {
      if (targetSectionId === dragId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDropTarget({ id: targetSectionId, position: e.clientY < midY ? 'before' : 'after' });
    } else if (dragType === 'card') {
      e.dataTransfer.dropEffect = 'move';
      setDropSectionHighlight(targetSectionId);
    }
  };

  const handleCardDropOnSection = async (cardId: string, targetSectionId: string | null) => {
    if (!deckId) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const sectionCards = cards
      .filter((c) => (targetSectionId ? c.section_id === targetSectionId : !c.section_id) && c.id !== cardId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const updates = sectionCards.map((c, i) => ({ id: c.id, section_id: targetSectionId, order_index: i }));
    updates.push({ id: cardId, section_id: targetSectionId, order_index: sectionCards.length });
    try { await reorderCards(deckId, updates); }
    catch (err) { console.error('Failed to move card:', err); addToast('error', 'Failed to move card'); fetchCards(deckId); }
  };

  const handleSectionDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!deckId) { clearDragState(); return; }
    if (dragType === 'section' && dragId) {
      const currentOrder = sections.map((s) => s.id);
      const fromIndex = currentOrder.indexOf(dragId);
      const toIndex = currentOrder.indexOf(targetSectionId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) { clearDragState(); return; }
      const newOrder = [...currentOrder];
      newOrder.splice(fromIndex, 1);
      const insertAt = dropTarget?.position === 'before' ? newOrder.indexOf(targetSectionId) : newOrder.indexOf(targetSectionId) + 1;
      newOrder.splice(insertAt, 0, dragId);
      try { await reorderSections(deckId, newOrder); }
      catch (err) { console.error('Failed to reorder sections:', err); addToast('error', 'Failed to reorder sections'); fetchSections(deckId); }
    } else if (dragType === 'card' && dragId) {
      await handleCardDropOnSection(dragId, targetSectionId);
    }
    clearDragState();
  };

  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    if (selectMode) { e.preventDefault(); return; }
    setDragType('card'); setDragId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    if (dragType !== 'card' || dragId === targetCardId) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    if (view === 'grid') {
      const midX = rect.left + rect.width / 2;
      setDropTarget({ id: targetCardId, position: e.clientX < midX ? 'before' : 'after' });
    } else {
      const midY = rect.top + rect.height / 2;
      setDropTarget({ id: targetCardId, position: e.clientY < midY ? 'before' : 'after' });
    }
  };

  const handleCardDrop = async (e: React.DragEvent, targetCardId: string, sectionId: string | null) => {
    e.preventDefault();
    if (dragType !== 'card' || !dragId || !deckId) { clearDragState(); return; }
    const targetCard = cards.find((c) => c.id === targetCardId);
    if (!targetCard) { clearDragState(); return; }
    const sectionCards = cards
      .filter((c) => (sectionId ? c.section_id === sectionId : !c.section_id) && c.id !== dragId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const targetIndex = sectionCards.findIndex((c) => c.id === targetCardId);
    const insertAt = dropTarget?.position === 'after' ? targetIndex + 1 : targetIndex;
    sectionCards.splice(insertAt, 0, cards.find((c) => c.id === dragId)!);
    const updates = sectionCards.map((c, i) => ({ id: c.id, section_id: sectionId, order_index: i }));
    try { await reorderCards(deckId, updates); }
    catch (err) { console.error('Failed to reorder cards:', err); addToast('error', 'Failed to reorder cards'); fetchCards(deckId); }
    clearDragState();
  };

  const handleUnsectionedDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragType === 'card') { e.dataTransfer.dropEffect = 'move'; setDropSectionHighlight('__unsectioned'); }
  };

  const handleUnsectionedDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragType === 'card' && dragId) await handleCardDropOnSection(dragId, null);
    clearDragState();
  };

  return {
    dragType, dragId, dropTarget, dropSectionHighlight,
    clearDragState,
    handleSectionDragStart, handleSectionDragOver, handleSectionDrop,
    handleCardDragStart, handleCardDragOver, handleCardDrop,
    handleUnsectionedDragOver, handleUnsectionedDrop,
    setDropTarget, setDropSectionHighlight,
  };
}
