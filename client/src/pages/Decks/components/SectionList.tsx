import {
  ChevronDown, ChevronRight as ChevronRightIcon,
  Edit2, Search as SearchIcon, Trash2, GripVertical, X,
} from 'lucide-react';
import CardGrid from './CardGrid';
import styles from '../DeckDetail.module.css';

interface Section {
  id: string;
  name: string;
  order_index: number;
}

interface SectionListProps {
  sections: Section[];
  cardsBySection: Record<string, any[]>;
  collapsedSections: Set<string>;
  sectionSearchVisible: Set<string>;
  sectionSearches: Record<string, string>;
  editingSectionId: string | null;
  editingSectionName: string;
  showNewSection: boolean;
  newSectionName: string;
  // Card grid props
  view: 'grid' | 'list';
  selectMode: boolean;
  selectedIds: Set<string>;
  courseColor?: string;
  // Drag state
  dragType: 'section' | 'card' | null;
  dragId: string | null;
  dropTarget: { id: string; position: 'before' | 'after' } | null;
  dropSectionHighlight: string | null;
  // Section handlers
  onToggleSection: (id: string) => void;
  onEditSection: (id: string, name: string) => void;
  onSetEditingSectionName: (name: string) => void;
  onSectionRename: (id: string) => void;
  onCancelEditSection: () => void;
  onToggleSectionSearch: (id: string) => void;
  onSetSectionSearch: (id: string, query: string) => void;
  onDeleteSection: (section: { id: string; name: string; cardCount: number }) => void;
  // New section handlers
  onSetNewSectionName: (name: string) => void;
  onAddSection: () => void;
  onCancelNewSection: () => void;
  // Section drag handlers
  onSectionDragStart: (e: React.DragEvent, sectionId: string) => void;
  onSectionDragOver: (e: React.DragEvent, sectionId: string) => void;
  onSectionDragLeave: () => void;
  onSectionDrop: (e: React.DragEvent, sectionId: string) => void;
  onDragEnd: () => void;
  // Card handlers (passed to CardGrid)
  onToggleSelect: (cardId: string) => void;
  onCardClick: (card: any) => void;
  onCardDragStart: (e: React.DragEvent, cardId: string) => void;
  onCardDragOver: (e: React.DragEvent, cardId: string) => void;
  onCardDragLeave: () => void;
  onCardDrop: (e: React.DragEvent, cardId: string, sectionId: string | null) => void;
  // Unsectioned handlers
  onUnsectionedDragOver: (e: React.DragEvent) => void;
  onUnsectionedDrop: (e: React.DragEvent) => void;
  onUnsectionedDragLeave: () => void;
  // Filter
  filterCardsBySearch: (cards: any[], sectionId: string) => any[];
}

export default function SectionList({
  sections, cardsBySection,
  collapsedSections, sectionSearchVisible, sectionSearches,
  editingSectionId, editingSectionName,
  showNewSection, newSectionName,
  view, selectMode, selectedIds, courseColor,
  dragType, dragId, dropTarget, dropSectionHighlight,
  onToggleSection, onEditSection, onSetEditingSectionName,
  onSectionRename, onCancelEditSection,
  onToggleSectionSearch, onSetSectionSearch, onDeleteSection,
  onSetNewSectionName, onAddSection, onCancelNewSection,
  onSectionDragStart, onSectionDragOver, onSectionDragLeave, onSectionDrop, onDragEnd,
  onToggleSelect, onCardClick,
  onCardDragStart, onCardDragOver, onCardDragLeave, onCardDrop,
  onUnsectionedDragOver, onUnsectionedDrop, onUnsectionedDragLeave,
  filterCardsBySearch,
}: SectionListProps) {

  const unsectionedCards = cardsBySection.__unsectioned || [];
  const unsectionedFiltered = filterCardsBySearch(unsectionedCards, '__unsectioned');
  const isUnsectionedDropHighlight = dropSectionHighlight === '__unsectioned' && dragType === 'card';
  const showUnsectioned = unsectionedFiltered.length > 0 || (dragType === 'card' && sections.length > 0);

  return (
    <>
      {/* New Section Input */}
      {showNewSection && (
        <div className={styles.newSectionRow}>
          <input
            className={styles.newSectionInput}
            placeholder="Section name..."
            value={newSectionName}
            onChange={(e) => onSetNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddSection()}
            autoFocus
          />
          <button className={styles.newSectionSave} onClick={onAddSection}>Add</button>
          <button className={styles.newSectionCancel} onClick={onCancelNewSection}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        const sectionCards = cardsBySection[section.id] || [];
        const filteredCards = filterCardsBySearch(sectionCards, section.id);
        const collapsed = collapsedSections.has(section.id);
        const isSectionDragged = dragType === 'section' && dragId === section.id;
        const isSectionDropTarget = dropTarget?.id === section.id && dragType === 'section';
        const isSectionCardDropHighlight = dropSectionHighlight === section.id && dragType === 'card';
        const sectionDropClass = isSectionDropTarget
          ? (dropTarget.position === 'before' ? styles.sectionDropBefore : styles.sectionDropAfter)
          : '';
        return (
          <div
            key={section.id}
            className={`${styles.sectionGroup} ${isSectionDragged ? styles.sectionDragging : ''} ${sectionDropClass}`}
            draggable={editingSectionId !== section.id}
            onDragStart={(e) => onSectionDragStart(e, section.id)}
            onDragOver={(e) => onSectionDragOver(e, section.id)}
            onDragLeave={onSectionDragLeave}
            onDrop={(e) => onSectionDrop(e, section.id)}
            onDragEnd={onDragEnd}
          >
            <div className={`${styles.sectionHeader} ${isSectionCardDropHighlight ? styles.sectionDropHighlight : ''}`} onClick={() => onToggleSection(section.id)}>
              <div className={styles.dragHandle} onMouseDown={(e) => e.stopPropagation()}>
                <GripVertical size={14} />
              </div>
              {collapsed ? <ChevronRightIcon size={14} /> : <ChevronDown size={14} />}
              {editingSectionId === section.id ? (
                <input
                  className={styles.sectionNameInput}
                  value={editingSectionName}
                  onChange={(e) => onSetEditingSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSectionRename(section.id);
                    if (e.key === 'Escape') onCancelEditSection();
                  }}
                  onBlur={() => onSectionRename(section.id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span className={styles.sectionName}>{section.name}</span>
              )}
              <div className={styles.sectionActions}>
                <button
                  className={styles.sectionActionBtn}
                  onClick={(e) => { e.stopPropagation(); onEditSection(section.id, section.name); }}
                  title="Rename section"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className={styles.sectionActionBtn}
                  onClick={(e) => { e.stopPropagation(); onToggleSectionSearch(section.id); }}
                  title="Search in section"
                >
                  <SearchIcon size={12} />
                </button>
                <button
                  className={`${styles.sectionActionBtn} ${styles.danger}`}
                  onClick={(e) => { e.stopPropagation(); onDeleteSection({ id: section.id, name: section.name, cardCount: sectionCards.length }); }}
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
                  onChange={(e) => onSetSectionSearch(section.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            {!collapsed && filteredCards.length > 0 && (
              <CardGrid
                cards={filteredCards}
                sectionId={section.id}
                view={view}
                selectMode={selectMode}
                selectedIds={selectedIds}
                dragType={dragType}
                dragId={dragId}
                dropTarget={dropTarget}
                courseColor={courseColor}
                onToggleSelect={onToggleSelect}
                onCardClick={onCardClick}
                onCardDragStart={onCardDragStart}
                onCardDragOver={onCardDragOver}
                onCardDragLeave={onCardDragLeave}
                onCardDrop={onCardDrop}
                onDragEnd={onDragEnd}
              />
            )}
          </div>
        );
      })}

      {/* Unsectioned cards */}
      {showUnsectioned && (
        <div
          className={styles.sectionGroup}
          onDragOver={onUnsectionedDragOver}
          onDragLeave={onUnsectionedDragLeave}
          onDrop={onUnsectionedDrop}
        >
          {sections.length > 0 && (
            <>
              <div className={`${styles.sectionHeader} ${isUnsectionedDropHighlight ? styles.sectionDropHighlight : ''}`} onClick={() => onToggleSectionSearch('__unsectioned')}>
                <span className={styles.sectionName}>Unsectioned</span>
                <div className={styles.sectionActions}>
                  <button
                    className={styles.sectionActionBtn}
                    onClick={(e) => { e.stopPropagation(); onToggleSectionSearch('__unsectioned'); }}
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
                    onChange={(e) => onSetSectionSearch('__unsectioned', e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
          {unsectionedFiltered.length > 0 && (
            <CardGrid
              cards={unsectionedFiltered}
              sectionId={null}
              view={view}
              selectMode={selectMode}
              selectedIds={selectedIds}
              dragType={dragType}
              dragId={dragId}
              dropTarget={dropTarget}
              courseColor={courseColor}
              onToggleSelect={onToggleSelect}
              onCardClick={onCardClick}
              onCardDragStart={onCardDragStart}
              onCardDragOver={onCardDragOver}
              onCardDragLeave={onCardDragLeave}
              onCardDrop={onCardDrop}
              onDragEnd={onDragEnd}
            />
          )}
          {unsectionedFiltered.length === 0 && dragType === 'card' && (
            <div className={`${styles.dropZone} ${isUnsectionedDropHighlight ? styles.dropZoneActive : ''}`}>
              Drop here to unsection
            </div>
          )}
        </div>
      )}
    </>
  );
}
