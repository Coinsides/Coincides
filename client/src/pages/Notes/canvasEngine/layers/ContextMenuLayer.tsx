import {
  Braces,
  Boxes,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clipboard,
  Code2,
  Copy,
  CopyPlus,
  Circle,
  Eraser,
  EyeOff,
  ExternalLink,
  FilePlus2,
  Files,
  FolderOpen,
  Heading,
  Info,
  Image as ImageIcon,
  Link,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  MoveUpRight,
  Maximize2,
  Palette,
  PanelRightOpen,
  Pilcrow,
  Quote,
  Replace,
  Scissors,
  Sigma,
  Split,
  Square,
  StickyNote,
  Tag,
  Table2,
  Trash2,
  Type,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CommandActionId,
  CommandMenuItem,
  CommandSurfaceMenu,
} from '../commandSurfaceService';
import styles from '../../NoteDetail.module.css';

const ICONS: Record<string, LucideIcon> = {
  braces: Braces,
  boxes: Boxes,
  'arrow-right': ArrowRight,
  check: Check,
  'chevrons-down-up': ChevronsDownUp,
  'chevrons-up-down': ChevronsUpDown,
  circle: Circle,
  clipboard: Clipboard,
  code: Code2,
  copy: Copy,
  'copy-plus': CopyPlus,
  eraser: Eraser,
  'eye-off': EyeOff,
  'external-link': ExternalLink,
  'file-plus-2': FilePlus2,
  files: Files,
  'folder-open': FolderOpen,
  heading: Heading,
  info: Info,
  image: ImageIcon,
  link: Link,
  list: List,
  'list-checks': ListChecks,
  'list-collapse': ListCollapse,
  'list-ordered': ListOrdered,
  'move-up-right': MoveUpRight,
  maximize: Maximize2,
  palette: Palette,
  'panel-right-open': PanelRightOpen,
  pilcrow: Pilcrow,
  quote: Quote,
  replace: Replace,
  scissors: Scissors,
  sigma: Sigma,
  split: Split,
  square: Square,
  'sticky-note': StickyNote,
  tag: Tag,
  table: Table2,
  trash: Trash2,
  type: Type,
  unlink: Unlink,
};

interface ContextMenuLayerProps {
  menu: CommandSurfaceMenu | null;
  onClose: () => void;
  onAction: (actionId: CommandActionId, item: CommandMenuItem) => void | Promise<void | false> | false;
}

function clampMenuPosition(point: { x: number; y: number }, menuWidth = 252, menuHeight = 360) {
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  return {
    left: Math.min(viewportWidth - menuWidth - 10, Math.max(10, point.x)),
    top: Math.min(viewportHeight - menuHeight - 10, Math.max(10, point.y)),
  };
}

function MenuIcon({ iconName }: { iconName?: string }) {
  if (!iconName) return <span className={styles.contextMenuIconPlaceholder} aria-hidden="true" />;
  const Icon = ICONS[iconName] || Check;
  return <Icon size={15} aria-hidden="true" />;
}

export function ContextMenuLayer({
  menu,
  onClose,
  onAction,
}: ContextMenuLayerProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const position = useMemo(() => (
    menu ? clampMenuPosition(menu.point) : { left: 0, top: 0 }
  ), [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    setOpenSubmenuId(null);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const handleAction = async (item: CommandMenuItem) => {
    if (!item.actionId || item.disabled) return;
    const result = await onAction(item.actionId, item);
    if (result !== false) onClose();
  };

  const renderItem = (item: CommandMenuItem) => {
    if (item.kind === 'separator') {
      return <div key={item.id} className={styles.contextMenuSeparator} role="separator" />;
    }

    if (item.kind === 'submenu') {
      const open = openSubmenuId === item.id;
      return (
        <div
          key={item.id}
          className={styles.contextMenuSubmenuWrap}
          onMouseEnter={() => setOpenSubmenuId(item.id)}
        >
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => setOpenSubmenuId(menu.kind === 'text_unit_handle' ? item.id : open ? null : item.id)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <MenuIcon iconName={item.iconName} />
            <span>{item.label}</span>
            <ChevronRight size={14} className={styles.contextMenuChevron} aria-hidden="true" />
          </button>
          {open && item.children && (
            <div className={styles.contextSubmenu} role="menu">
              {item.children.map(renderItem)}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        className={styles.contextMenuItem}
        disabled={item.disabled}
        title={item.disabled ? item.disabledReason : undefined}
        onClick={() => void handleAction(item)}
      >
        <MenuIcon iconName={item.iconName} />
        <span>{item.label}</span>
        {item.checked && <Check size={13} className={styles.contextMenuCheck} aria-hidden="true" />}
      </button>
    );
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: position.left, top: position.top }}
      role="menu"
      aria-label={menu.title || 'Context menu'}
      data-command-context-menu="true"
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
    >
      {menu.title && <div className={styles.contextMenuTitle}>{menu.title}</div>}
      {menu.items.map(renderItem)}
    </div>
  );
}
