import { ChevronDown, ChevronRight } from 'lucide-react';
import './ChapterHeadingFurniture.css';

export interface ChapterHeadingFurnitureProps {
  id: string; title: string; number: string; collapsed: boolean; onToggle: () => void;
}

/** A heading's furniture, never a container around the chapter's content. */
export function ChapterHeadingFurniture({ id, title, number, collapsed, onToggle }: ChapterHeadingFurnitureProps) {
  return <span id={id} className="chapterHeadingFurniture" data-chapter-anchor={id}>
    {number && <span className="chapterHeadingNumber" aria-label={`Chapter ${number}`}>{number}</span>}
    <button type="button" aria-label={`${collapsed ? 'Expand' : 'Collapse'} chapter: ${title || 'Untitled'}`}
      aria-expanded={!collapsed} onMouseDown={(event) => event.preventDefault()} onClick={onToggle}>
      {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
    </button>
  </span>;
}
