import { useEffect, useRef } from 'react';
import { FileText, Image, Layers, Minus, Pencil, Quote, Square, Table2, Type, X, type LucideIcon } from 'lucide-react';
import { selectionKey, type BoardSelection } from './boardSelection';
import type { BoardDetail, BoardMember, BoardVisual } from './boardTypes';
import styles from './BoardSelectionSidebar.module.css';

interface BoardSelectionSidebarProps {
  detail: Pick<BoardDetail, 'members' | 'visuals' | 'edges'>;
  selectedKeys: Set<string>;
  strokeOrder: Map<string, number>;
  highlightedKey: string | null;
  onHover: (key: string | null) => void;
  onLocate: (selection: BoardSelection) => void;
  onRemove: (keys: string[]) => void;
  onClose: () => void;
}

type SelectionRow = { selection: BoardSelection; key: string; title: string; kind: string; Icon: LucideIcon };
type GroupName = 'Cards' | 'Chalk' | 'Strokes' | 'Connections' | 'Objects';
const groupNames: GroupName[] = ['Cards', 'Chalk', 'Strokes', 'Connections', 'Objects'];
const memberKinds = {
  note: { label: 'Note', Icon: FileText },
  content_group: { label: 'Group', Icon: Layers },
  item: { label: 'Item', Icon: Square },
  text_range: { label: 'Text range', Icon: Quote },
};

function text(value: unknown) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''; }
function record(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return record(JSON.parse(value)); } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function memberTitle(member: BoardMember) {
  const reference = member.reference;
  const excerpt = member.member_kind === 'item' || member.member_kind === 'text_range';
  return (excerpt && (text(reference.summary) || text(reference.plain_text)))
    || text(reference.title) || memberKinds[member.member_kind].label;
}

function objectTitle(visual: BoardVisual) {
  const source = record(visual.data.tray_source);
  const extension = record(record(source.extensions)[visual.visual_kind]);
  const blocks = Array.isArray(source.backing_blocks) ? source.backing_blocks : [];
  return text(visual.data.title) || text(visual.data.text) || text(visual.data.label) || text(visual.metadata.title)
    || text(extension.alt_text) || text(extension.caption) || text(extension.label)
    || text(blocks.map((block) => text(record(block).plain_text)).filter(Boolean).join(' '))
    || ({ shape: 'Shape', image: 'Image', table: 'Table', connector: 'Connection', sticky: 'Chalk', freehand: 'Stroke' })[visual.visual_kind];
}

/** A live view of the board's selection; removal here only removes selection keys. */
export function BoardSelectionSidebar({ detail, selectedKeys, strokeOrder, highlightedKey,
  onHover, onLocate, onRemove, onClose }: BoardSelectionSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const groups = new Map<GroupName, SelectionRow[]>(groupNames.map((name) => [name, []]));
  const append = (group: GroupName, selection: BoardSelection, title: string, kind: string, Icon: LucideIcon) => {
    const key = selectionKey(selection);
    if (selectedKeys.has(key)) groups.get(group)!.push({ selection, key, title, kind, Icon });
  };
  for (const member of detail.members) {
    if (member.placed === false) continue;
    const { label, Icon } = memberKinds[member.member_kind];
    append('Cards', { kind: 'member', id: member.id }, memberTitle(member), label, Icon);
  }
  let strokeIndex = 0;
  for (const visual of detail.visuals) {
    const selection = { kind: 'visual' as const, id: visual.id };
    if (visual.visual_kind === 'freehand') {
      strokeIndex += 1;
      append('Strokes', selection, `Stroke ${strokeOrder.get(visual.id) ?? strokeIndex}`, 'Stroke', Pencil);
    } else if (visual.visual_kind === 'sticky') {
      append('Chalk', selection, text(visual.data.text) || 'Chalk', 'Chalk', Type);
    } else if (visual.visual_kind === 'connector') {
      append('Connections', selection, objectTitle(visual), 'Connection', Minus);
    } else {
      const Icon = visual.visual_kind === 'image' ? Image : visual.visual_kind === 'table' ? Table2 : Square;
      append('Objects', selection, objectTitle(visual), visual.visual_kind, Icon);
    }
  }
  const members = new Map(detail.members.map((member) => [member.id, member]));
  for (const edge of detail.edges) {
    const from = members.get(edge.from_member_id);
    const to = members.get(edge.to_member_id);
    const title = text(edge.label) || (from && to ? `${memberTitle(from)} → ${memberTitle(to)}` : 'Connection');
    append('Connections', { kind: 'edge', id: edge.id }, title, 'Connection', Minus);
  }
  const count = [...groups.values()].reduce((total, rows) => total + rows.length, 0);

  useEffect(() => {
    const container = scrollRef.current;
    const row = highlightedKey ? rowRefs.current.get(highlightedKey) : undefined;
    if (!container || !row) return;
    // Scroll this list alone: scrollIntoView can also move the board's ancestors.
    const bounds = container.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    const top = bounds.top + container.clientTop;
    const bottom = top + container.clientHeight;
    if (rowBounds.top < top) container.scrollTop += rowBounds.top - top;
    else if (rowBounds.bottom > bottom) container.scrollTop += rowBounds.bottom - bottom;
  }, [highlightedKey, selectedKeys]);

  return <aside id="board-selection-sidebar" className={styles.sidebar} aria-label="Selection list">
    <header className={styles.header}>
      <h2>Selection <span>({count})</span></h2>
      <button type="button" aria-label="Close selection list" onClick={onClose}><X size={16} aria-hidden="true" /></button>
    </header>
    <p className={styles.hint}>Hover to highlight. Click a row to locate it. × removes it from the selection.</p>
    <div ref={scrollRef} className={styles.scroll}>
      {count === 0 ? <p className={styles.empty}>Nothing selected. Select objects on the board to list them here.</p>
        : groupNames.map((name) => {
          const rows = groups.get(name)!;
          if (!rows.length) return null;
          return <section className={styles.group} key={name} aria-label={name}>
            <header className={styles.groupHeader}>
              <h3>{name} <span>({rows.length})</span></h3>
              <button type="button" className={styles.remove} aria-label={`Remove all ${name} from selection`}
                title={`Remove all ${name.toLowerCase()} from selection`} onClick={() => onRemove(rows.map(({ key }) => key))}>
                <X size={14} aria-hidden="true" />
              </button>
            </header>
            <ul className={styles.list}>{rows.map(({ selection, key, title, kind, Icon }) => <li
              key={key} ref={(element) => { if (element) rowRefs.current.set(key, element); else rowRefs.current.delete(key); }}
              className={styles.row} data-selection-key={key} data-selection-highlighted={highlightedKey === key ? 'true' : 'false'}
              onPointerEnter={() => onHover(key)} onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(key)} onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHover(null);
              }}>
              <button type="button" className={styles.locate} title={`Locate ${kind}: ${title}`} onClick={() => onLocate(selection)}>
                <Icon size={15} aria-hidden="true" /><span className={styles.name}>{title}</span>
              </button>
              <button type="button" className={styles.remove} aria-label={`Remove ${title} from selection`}
                title="Remove from selection" onClick={() => onRemove([key])}><X size={14} aria-hidden="true" /></button>
            </li>)}</ul>
          </section>;
        })}
    </div>
  </aside>;
}
