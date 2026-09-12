import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hand, Link2, MousePointer2, MoveDiagonal2, Pencil, Plus, Minus, Pin, Trash2, ExternalLink, X, Inbox, Eraser, Undo2, Redo2, Layers, List } from 'lucide-react';
import { boardErrorMessage, loadBoardCandidates, loadBoardNotePreview } from './boardRepository';
import type { BoardCandidate, BoardEdge, BoardMember, BoardViewport, BoardVisual } from './boardTypes';
import { animateBoardViewport, pointsPath, toBoardPoint, zoomBoardAt, type BoardPoint } from './boardViewport';
import { useBoard } from './useBoard';
import { useBoardSkin } from './useBoardSkin';
import { SkinEditor } from '@/components/Skin/SkinEditor';
import { BoardRelocatedVisual } from './BoardRelocatedVisual';
import { BoardDeleteDialog } from './BoardDeleteDialog';
import { BoardNewNoteDialog } from './BoardNewNoteDialog';
import { BoardChalkEditor, chalkGeometry, type ChalkDraft } from './BoardChalk';
import BoardNoteModal, { type BoardNoteModalHandle } from './BoardNoteModal';
import { BoardStaging, BOARD_STAGING_MIME } from './BoardStaging';
import { BoardSelectionSidebar } from './BoardSelectionSidebar';
import { BoardLayers } from './BoardLayers';
import { BoardViewportBookmarks } from './BoardViewportBookmarks';
import { boardLayerScene, layerIdOf } from './boardLayerScene';
import { getActiveBoardLayer, setActiveBoardLayer } from './boardActiveLayer';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';
import { BoardReferenceTag } from './BoardReferenceTag';
import { BOARD_TEXT_RANGE_MIME, parseBoardTextRangeClipboard } from './boardTextRangeClipboard';
import { connectionPoint, deletionScope, marqueeSelection, selectionFromKeys, selectionKey, selectionRect, visualBounds, type BoardSelection, type BoardRect } from './boardSelection';
import { snapBoardTranslation, type BoardAlignmentGuide } from './boardSnapping';
import styles from './Boards.module.css';

type Tool = 'select' | 'pan' | 'connect' | 'pen' | 'eraser';
type Selection = BoardSelection | null;
type MoveObject = BoardMember | BoardVisual;
type Gesture =
  | { kind: 'pan'; start: BoardPoint; viewport: BoardViewport }
  | { kind: 'resize'; start: BoardPoint; object: MoveObject }
  | { kind: 'move'; start: BoardPoint; point: BoardPoint; objects: MoveObject[]; primary: BoardRect; targets: BoardRect[]; moved: boolean }
  | { kind: 'marquee'; start: BoardPoint; base: Set<string>; mode: 'replace' | 'add' | 'subtract' }
  | { kind: 'eraser'; ids: Set<string>; previous?: BoardPoint }
  | { kind: 'pen'; points: BoardPoint[]; layer_id: string | null };

function strokePath(visual: BoardVisual): string {
  if (typeof visual.data.path === 'string') return visual.data.path;
  if (!Array.isArray(visual.data.points)) return '';
  return pointsPath(visual.data.points.filter((point): point is BoardPoint => Boolean(point
    && typeof point.x === 'number' && typeof point.y === 'number')));
}

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const board = useBoard(boardId);
  const skin = useBoardSkin(board.detail?.board ?? null, board.updateBoard);
  const [tool, setTool] = useState<Tool>('select');
  const [selectionState, setSelectionState] = useState<{ keys: Set<string>; anchor: Selection }>({ keys: new Set(), anchor: null });
  const selectedKeys = selectionState.keys;
  const selection = selectedKeys.size === 1 ? selectionState.anchor : null;
  const [marquee, setMarquee] = useState<BoardRect | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<BoardAlignmentGuide[]>([]);
  const [erasedIds, setErasedIds] = useState<Set<string>>(new Set());
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [selectionListOpen, setSelectionListOpen] = useState(false);
  const [listHoverKey, setListHoverKey] = useState<string | null>(null);
  const [boardHoverKey, setBoardHoverKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ key: string; sequence: number } | null>(null);
  const flashSequence = useRef(0);
  const selectionListToggle = useRef<HTMLButtonElement>(null);
  const [deleteKeys, setDeleteKeys] = useState<Set<string> | null>(null);
  const groupDeleteDialog = useRef<HTMLDialogElement>(null);
  const groupDeleteWasOpen = useRef(false);
  const [groupDrafts, setGroupDrafts] = useState<Map<string, MoveObject>>(new Map());
  const groupDraftsRef = useRef<Map<string, MoveObject>>(new Map());
  function setSelection(next: Selection) {
    setSelectionState({ keys: new Set(next ? [selectionKey(next)] : []), anchor: next });
  }
  function selectObject(next: BoardSelection, toggle = false, preserve = false) {
    const key = selectionKey(next);
    if (preserve && selectedKeys.has(key)) return;
    setSelectionState((current) => {
      const keys = toggle ? new Set(current.keys) : new Set<string>();
      if (toggle && keys.has(key)) keys.delete(key); else keys.add(key);
      return { ...selectionFromKeys(keys), ...(keys.has(key) ? { anchor: next } : {}) };
    });
  }
  function removeSelectionKeys(removed: string[]) {
    setSelectionState((current) => selectionFromKeys(new Set([...current.keys].filter((key) => !removed.includes(key)))));
  }
  function selectWithModifiers(next: BoardSelection, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) {
    if (event.altKey) removeSelectionKeys([selectionKey(next)]);
    else selectObject(next, event.shiftKey || event.ctrlKey || event.metaKey);
  }
  function isSelected(kind: BoardSelection['kind'], id: string) { return selectedKeys.has(selectionKey({ kind, id })); }
  function focusSelection(next: BoardSelection) { if (!gesture.current) selectObject(next, false, true); }
  useEffect(() => {
    if (deleteKeys) groupDeleteDialog.current?.showModal();
    // Native showModal makes the canvas inert until React removes the dialog.
    // Restore focus after that commit so the next undo shortcut reaches the board.
    else if (groupDeleteWasOpen.current) surface.current?.focus();
    groupDeleteWasOpen.current = Boolean(deleteKeys);
  }, [deleteKeys]);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<BoardCandidate[]>([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const candidateRevision = useRef(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(() => boardId ? getActiveBoardLayer(boardId) : null);
  const layersToggle = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<{ id: string; value: string } | null>(null);
  const [chalkDraft, setChalkDraft] = useState<ChalkDraft | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const newNoteToggle = useRef<HTMLButtonElement>(null);
  const [notePreviews, setNotePreviews] = useState<Record<string, string>>({});
  const notePreviewRevisions = useRef(new Map<string, number>());
  const noteModal = useRef<BoardNoteModalHandle>(null);
  const openNoteIdRef = useRef<string | null>(null);
  openNoteIdRef.current = openNoteId;
  const boardPaused = useRef(false);
  boardPaused.current = Boolean(openNoteId) || newNoteOpen;
  const titleInput = useRef<HTMLInputElement>(null);
  const pickerToggle = useRef<HTMLButtonElement>(null);
  const stagingToggle = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState('');
  const [viewport, setViewport] = useState<BoardViewport | null>(null);
  const [viewportDirty, setViewportDirty] = useState(false);
  const [objectDraft, setObjectDraft] = useState<BoardMember | BoardVisual | null>(null);
  const [ink, setInk] = useState<BoardPoint[]>([]);
  const surface = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const capturedPointer = useRef<Element | null>(null);
  const gestureRevision = useRef(0);
  const visitRevision = useRef(0);
  const routeId = useRef(boardId);
  routeId.current = boardId;
  const objectDraftRef = useRef<BoardMember | BoardVisual | null>(null);
  const viewportRef = useRef<BoardViewport | null>(null);
  const viewportTimer = useRef<ReturnType<typeof setTimeout>>();
  const cancelViewportAnimation = useRef<(() => void) | null>(null);
  const viewportPending = useRef<BoardViewport | null>(null);
  const saveViewport = useRef(board.updateBoard);
  saveViewport.current = board.updateBoard;
  const spaceDown = useRef(false);
  const detail = board.detail;

  function closePicker() {
    setPickerOpen(false);
    pickerToggle.current?.focus();
  }

  const loadCandidates = useCallback(async () => {
    const revision = ++candidateRevision.current;
    setCandidateLoading(true);
    setCandidateError(null);
    try {
      const next = await loadBoardCandidates();
      if (revision === candidateRevision.current) setCandidates(next);
    }
    catch (cause) { if (revision === candidateRevision.current) setCandidateError(boardErrorMessage(cause)); }
    finally { if (revision === candidateRevision.current) setCandidateLoading(false); }
  }, []);
  useEffect(() => {
    void loadCandidates();
    return () => { candidateRevision.current += 1; };
  }, [boardId, loadCandidates]);

  function openPicker() {
    setPickerOpen(true);
    void loadCandidates();
  }
  useEffect(() => {
    visitRevision.current += 1;
    setViewport(null);
    setViewportDirty(false);
    viewportRef.current = null;
    setSelection(null);
    setSelectionListOpen(false);
    setListHoverKey(null);
    setBoardHoverKey(null);
    setFlash(null);
    setDeleteKeys(null);
    setMarquee(null);
    setAlignmentGuides([]);
    setErasedIds(new Set());
    setSelectionNotice(null);
    setGroupDrafts(new Map());
    groupDraftsRef.current = new Map();
    setConnectFrom(null);
    gesture.current = null;
    setObjectDraft(null);
    objectDraftRef.current = null;
    setTitleDraft(null);
    setLabelDraft(null);
    setChalkDraft(null);
    setOpenNoteId(null);
    setNewNoteOpen(false);
    setNotePreviews({});
    notePreviewRevisions.current.clear();
    setDeleting(false);
    setStagingOpen(false);
    setLayersOpen(false);
    setActiveLayerId(boardId ? getActiveBoardLayer(boardId) : null);
    setPasteError(null);
    setInk([]);
    return () => { visitRevision.current += 1; };
  }, [boardId]);
  useEffect(() => {
    if (detail && !viewportRef.current) {
      viewportRef.current = detail.board.viewport;
      setViewport(detail.board.viewport);
    }
  }, [detail]);

  const commitViewport = useCallback(async () => {
    clearTimeout(viewportTimer.current);
    const next = viewportPending.current;
    viewportPending.current = null;
    if (!next) return true;
    setViewportDirty(false);
    return saveViewport.current({ viewport: next });
  }, []);

  useEffect(() => {
    const updateForThisBoard = board.updateBoard;
    return () => {
      cancelViewportAnimation.current?.();
      cancelViewportAnimation.current = null;
      clearTimeout(viewportTimer.current);
      const pending = viewportPending.current;
      viewportPending.current = null;
      if (pending) void updateForThisBoard({ viewport: pending });
    };
  }, [boardId, board.updateBoard]);

  function changeViewport(next: BoardViewport, debounce = true, animationFrame = false) {
    if (!animationFrame) {
      cancelViewportAnimation.current?.();
      cancelViewportAnimation.current = null;
    }
    viewportRef.current = next;
    setViewport(next);
    viewportPending.current = next;
    setViewportDirty(true);
    clearTimeout(viewportTimer.current);
    if (debounce) viewportTimer.current = setTimeout(() => { void commitViewport(); }, 200);
  }

  function jumpViewport(next: BoardViewport) {
    if (gesture.current || boardPaused.current || !viewportRef.current) return;
    cancelViewportAnimation.current?.();
    clearTimeout(viewportTimer.current);
    cancelViewportAnimation.current = animateBoardViewport(viewportRef.current, next,
      (frame) => changeViewport(frame, false, true),
      () => { cancelViewportAnimation.current = null; void commitViewport(); });
  }

  async function leave(path: string) {
    cancelViewportAnimation.current?.();
    cancelViewportAnimation.current = null;
    const visit = visitRevision.current;
    const fromBoard = boardId;
    if (!await commitViewport()) return;
    try {
      await board.flush();
      if (visit === visitRevision.current && fromBoard === routeId.current) navigate(path);
    } catch { /* The hook presents the save failure. */ }
  }

  async function openMember(member: BoardMember) {
    if ((member.member_kind !== 'text_range' && member.reference.state !== 'available') || !member.reference.note_id) return;
    await leave(`/notes/${encodeURIComponent(member.reference.note_id)}`);
  }

  function openNote(member: BoardMember) {
    const noteId = member.reference.note_id;
    if (member.member_kind !== 'note' || member.reference.state !== 'available' || !noteId) return;
    setSelectionListOpen(false);
    setListHoverKey(null);
    setBoardHoverKey(null);
    if (openNoteIdRef.current) {
      if (openNoteIdRef.current !== noteId) void noteModal.current?.requestClose({ kind: 'note', noteId });
      return;
    }
    spaceDown.current = false;
    setPickerOpen(false);
    setConnectFrom(null);
    setOpenNoteId(noteId);
  }

  function refreshProjections(noteId: string) {
    // Keep the live viewport and selection; only replay the saved references.
    void board.reload();
    void loadCandidates();
    const visit = visitRevision.current;
    const revision = (notePreviewRevisions.current.get(noteId) || 0) + 1;
    notePreviewRevisions.current.set(noteId, revision);
    const present = (summary: string) => {
      if (visit !== visitRevision.current || notePreviewRevisions.current.get(noteId) !== revision) return;
      setNotePreviews((current) => ({ ...current, [noteId]: summary }));
    };
    void loadBoardNotePreview(noteId).then(present, () => present('Preview unavailable. Enter the note to read.'));
  }

  function pauseBoard(event: React.SyntheticEvent) {
    if (!boardPaused.current) return;
    if (!newNoteOpen && (event.target as Element).closest('[data-board-staging="true"], [data-board-staging-control="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
  }

  async function pasteReference(event: React.ClipboardEvent<HTMLElement>) {
    if (boardPaused.current || deleteKeys || deleting) return;
    const visit = visitRevision.current;
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    const raw = event.clipboardData.getData(BOARD_TEXT_RANGE_MIME)
      || event.clipboardData.getData(`web ${BOARD_TEXT_RANGE_MIME}`);
    const pastedText = event.clipboardData.getData('text/plain');
    // Async ClipboardItem custom formats can arrive as a typed Blob on paste.
    const blob = Array.from(event.clipboardData.files || []).find((file) =>
      file.type === BOARD_TEXT_RANGE_MIME || file.type === `web ${BOARD_TEXT_RANGE_MIME}`);
    if (!detail || !surface.current) return;
    if (raw || blob) event.preventDefault();
    const point = toBoardPoint({ x: surface.current.clientWidth / 2, y: surface.current.clientHeight / 2 },
      viewportRef.current || detail.board.viewport);
    let payload = raw;
    if (!payload && blob && blob.size <= 210000) {
      try { payload = await blob.text(); } catch { /* Show the same unreadable-reference feedback. */ }
    }
    if (!raw && !blob) {
      // Some browsers expose web custom formats only through navigator.clipboard.read.
      // Inspect that exact MIME on the user's paste gesture; ordinary text stays ordinary text.
      try {
        if (!navigator.clipboard?.read) return;
        const items = await navigator.clipboard.read();
        const format = `web ${BOARD_TEXT_RANGE_MIME}`;
        const item = items.find((entry) => entry.types.includes(format));
        if (!item) return;
        const data = await item.getType(format);
        if (data.size <= 210000) payload = await data.text();
      } catch { return; }
    }
    const reference = parseBoardTextRangeClipboard(payload);
    // An async clipboard read cannot start a board edit after another host takes focus.
    if (boardPaused.current || visit !== visitRevision.current) return;
    if (!raw && !blob && reference?.excerpt !== pastedText) return;
    if (!reference) {
      setPasteError('This board reference could not be read. Select the passage and copy it again.');
      return;
    }
    setPasteError(null);
    void board.mountTextRange({
      text_range: reference, x: point.x - 160, y: point.y - 110, w: 320, h: 220,
      z_index: nextMemberZ(),
      layer_id: activeLayerId,
    });
  }

  function localPoint(event: { clientX: number; clientY: number }): BoardPoint {
    const rect = surface.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const stagedMembers = (detail?.members || []).filter((member) => member.placed === false);
  const scene = boardLayerScene(detail,
    (detail?.members || []).map((member) => (groupDrafts.get(member.id) as BoardMember | undefined) || (objectDraft?.id === member.id && 'member_kind' in objectDraft ? objectDraft : member)),
    (detail?.visuals || []).map((visual) => (groupDrafts.get(visual.id) as BoardVisual | undefined) || (objectDraft?.id === visual.id && 'visual_kind' in objectDraft ? objectDraft : visual)));
  const visibleMembers = scene.members;
  const visibleVisuals = scene.visuals;
  const visibleEdges = scene.edges;
  const visibleDetail = { members: visibleMembers, visuals: visibleVisuals, edges: visibleEdges };
  const activeLayerVisible = scene.layers.some((layer) => layer.id === activeLayerId && layer.visible);
  const selectedMember = selection?.kind === 'member' ? visibleMembers.find(({ id }) => id === selection.id) : undefined;
  const selectedVisual = selection?.kind === 'visual' ? visibleVisuals.find(({ id }) => id === selection.id) : undefined;
  const selectedEdge = selection?.kind === 'edge' ? visibleEdges.find(({ id }) => id === selection.id) : undefined;

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(timer);
  }, [flash]);
  useEffect(() => {
    if (listHoverKey && !selectedKeys.has(listHoverKey)) setListHoverKey(null);
    if (boardHoverKey && !selectedKeys.has(boardHoverKey)) setBoardHoverKey(null);
    if (flash && !selectedKeys.has(flash.key)) setFlash(null);
  }, [selectedKeys, listHoverKey, boardHoverKey, flash]);

  function selectionEmphasis(kind: BoardSelection['kind'], id: string) {
    const key = selectionKey({ kind, id });
    const highlighted = selectedKeys.has(key) && (boardHoverKey || listHoverKey) === key;
    const flashing = selectedKeys.has(key) && flash?.key === key;
    return {
      'data-selection-key': key,
      'data-selection-highlighted': highlighted ? 'true' : undefined,
      'data-selection-flashing': flashing ? 'true' : undefined,
      // Alternate names restart the short locate pulse even on repeated clicks.
      className: [highlighted ? styles.selectionHighlight : '', flashing ? (flash.sequence % 2 ? styles.selectionFlash : styles.selectionFlashAgain) : ''].filter(Boolean).join(' '),
    };
  }

  function hoverBoard(event: React.PointerEvent) {
    if (gesture.current) return;
    const key = (event.target as Element).closest('[data-selection-key]')?.getAttribute('data-selection-key');
    setBoardHoverKey(key && selectedKeys.has(key) ? key : null);
  }

  function locateSelection(target: BoardSelection) {
    if (!selectedKeys.has(selectionKey(target)) || !surface.current || gesture.current) return;
    const object = target.kind === 'member' ? visibleMembers.find(({ id }) => id === target.id)
      : target.kind === 'visual' ? visibleVisuals.find(({ id }) => id === target.id) : undefined;
    let bounds: BoardRect | undefined;
    if (object) bounds = 'visual_kind' in object ? visualBounds(object)
      : { x: object.x, y: object.y, w: object.w * object.scale, h: object.h * object.scale };
    else {
      const edge = visibleEdges.find(({ id }) => id === target.id);
      const from = visibleMembers.find(({ id }) => id === edge?.from_member_id);
      const to = visibleMembers.find(({ id }) => id === edge?.to_member_id);
      if (from && to) bounds = selectionRect(connectionPoint(from, to), connectionPoint(to, from));
    }
    if (!bounds) return;
    const current = viewportRef.current || detail!.board.viewport;
    // The overlay sidebar occupies the rightmost 280px of the canvas.
    const width = Math.max(1, surface.current.clientWidth - (selectionListOpen ? Math.min(280, surface.current.clientWidth) : 0));
    const height = surface.current.clientHeight;
    const zoom = Math.max(0.1, Math.min(current.zoom, Math.max(1, width - 64) / Math.max(1, bounds.w), Math.max(1, height - 64) / Math.max(1, bounds.h)));
    changeViewport({ zoom, x: width / 2 - (bounds.x + bounds.w / 2) * zoom,
      y: height / 2 - (bounds.y + bounds.h / 2) * zoom });
    setFlash({ key: selectionKey(target), sequence: ++flashSequence.current });
  }

  // Recreated objects receive new server IDs. A selection of a removed object
  // must not leave a phantom control bar after undo, redo, or a projection reload.
  useEffect(() => {
    if (!detail || board.pending || gesture.current) return;
    const liveKeys = new Set([
      ...visibleMembers.map(({ id }) => selectionKey({ kind: 'member', id })),
      ...visibleEdges.map(({ id }) => selectionKey({ kind: 'edge', id })),
      ...visibleVisuals.map(({ id }) => selectionKey({ kind: 'visual', id })),
    ]);
    setSelectionState((current) => {
      const keys = new Set([...current.keys].filter((key) => liveKeys.has(key)));
      if (keys.size === current.keys.size) return current;
      return selectionFromKeys(keys);
    });
  }, [detail, board.pending]);

  useEffect(() => {
    if (!detail) return;
    if (activeLayerId && !detail.layers?.some((layer) => layer.id === activeLayerId)) chooseLayer(null);
    if (connectFrom && !visibleMembers.some((member) => member.id === connectFrom)) setConnectFrom(null);
    if (labelDraft && !visibleEdges.some((edge) => edge.id === labelDraft.id)) setLabelDraft(null);
    if (chalkDraft && !scene.layers.some((layer) => layer.id === layerIdOf(chalkDraft) && layer.visible)) {
      setChalkDraft(null);
      setSelectionNotice('Chalk editing closed because its layer is hidden or removed.');
    }
  }, [detail]);

  function chooseLayer(id: string | null) {
    setActiveLayerId(id);
    if (boardId) setActiveBoardLayer(boardId, id);
  }

  function closeLayers() {
    setLayersOpen(false);
    layersToggle.current?.focus();
  }

  function defaultMemberPosition() {
    return toBoardPoint({ x: 80 + (visibleMembers.length % 3) * 300,
      y: 70 + Math.floor(visibleMembers.length / 3) * 200 }, viewportRef.current || detail!.board.viewport);
  }

  function nextMemberZ() {
    return Math.max(0, ...visibleMembers.map((member) => member.z_index), ...visibleVisuals.map((visual) => visual.z_index)) + 1;
  }

  async function stageCandidate(candidate: BoardCandidate) {
    if (board.pending) return;
    const visit = visitRevision.current;
    const saved = await board.mount({ id: crypto.randomUUID(), member_kind: candidate.member_kind,
      member_id: candidate.member_id, placed: false });
    if (saved && visit === visitRevision.current) openStaging();
  }

  async function stageTextRange(text_range: BoardTextRangeSelection) {
    const visit = visitRevision.current;
    const saved = await board.mountTextRange({ text_range, placed: false });
    if (saved && visit === visitRevision.current) openStaging();
    return saved;
  }

  async function placeMember(member: BoardMember, point = defaultMemberPosition()) {
    if (board.pending || chalkDraft || !detail?.members.some((current) => current.id === member.id && current.placed === false)) return;
    const visit = visitRevision.current;
    // Unplaced geometry has no meaning. Assign a complete placement in the one PATCH.
    const saved = await board.updateMember(member.id, { placed: true, x: point.x, y: point.y,
      w: member.member_kind === 'text_range' ? 320 : 260, h: member.member_kind === 'text_range' ? 220 : 156,
      scale: 1, pinned: false, z_index: nextMemberZ(),
      ...(activeLayerId !== layerIdOf(member) ? { layer_id: activeLayerId } : {}) });
    if (saved && visit === visitRevision.current) {
      setSelection({ kind: 'member', id: member.id });
      setConnectFrom(null);
    }
  }

  function dropStagedMember(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(BOARD_STAGING_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    let payload: { boardId?: unknown; memberId?: unknown };
    try { payload = JSON.parse(event.dataTransfer.getData(BOARD_STAGING_MIME)); }
    catch { return; }
    if (!payload || payload.boardId !== boardId || typeof payload.memberId !== 'string') return;
    const member = stagedMembers.find((current) => current.id === payload.memberId);
    if (member) void placeMember(member, toBoardPoint(localPoint(event), viewportRef.current || detail!.board.viewport));
  }

  function closeStaging() {
    setStagingOpen(false);
    stagingToggle.current?.focus();
  }
  function openStaging() {
    setSelectionListOpen(false);
    setListHoverKey(null);
    setStagingOpen(true);
  }
  function closeSelectionList() {
    setSelectionListOpen(false);
    setListHoverKey(null);
    setBoardHoverKey(null);
    if (selectedKeys.size) selectionListToggle.current?.focus();
    else surface.current?.focus();
  }

  function draftChalk(event: React.MouseEvent<HTMLDivElement>) {
    if (tool !== 'select' || spaceDown.current || !detail || chalkDraft) return;
    // Disabled note/item projections and drawing controls are still occupied space.
    if ((event.target as Element).closest('article, [data-visual-kind], [data-testid^="board-visual-"], button, input, textarea, [role="button"]')) return;
    if (!activeLayerVisible) { setSelectionNotice('Show the active layer to write chalk.'); return; }
    const point = toBoardPoint(localPoint(event), viewportRef.current || detail.board.viewport);
    setSelection(null);
    setChalkDraft({ text: '', x: point.x, y: point.y, w: 240, h: 160, scale: 1, pinned: false,
      z_index: nextMemberZ(), layer_id: activeLayerId });
  }

  function editChalk(visual: BoardVisual) {
    if (tool !== 'select' || chalkDraft || board.pending) return;
    setSelection({ kind: 'visual', id: visual.id });
    setChalkDraft({ ...visual, text: typeof visual.data.text === 'string' ? visual.data.text : '' });
  }

  async function saveChalk(text: string) {
    if (!chalkDraft) return false;
    const draft = chalkDraft;
    const visit = visitRevision.current;
    const saved = draft.id
      ? !text.trim() ? await board.removeVisual(draft.id) : await board.updateVisual(draft.id, { data: { text } })
      : await board.addVisual({ visual_kind: 'sticky', data: { text },
        x: draft.x, y: draft.y, w: draft.w, h: draft.h, scale: draft.scale, z_index: draft.z_index, layer_id: draft.layer_id ?? null });
    if (saved && visit === visitRevision.current) setChalkDraft((current) => current === draft ? null : current);
    return saved;
  }

  async function castChalk(visual: BoardVisual) {
    const visit = visitRevision.current;
    if (await board.castVisual(visual.id) && visit === visitRevision.current) {
      setSelection(null);
      void loadCandidates();
    }
  }

  function editLabel(edge: BoardEdge) {
    if (tool !== 'select' || board.pending) return;
    setSelection({ kind: 'edge', id: edge.id });
    setLabelDraft({ id: edge.id, value: edge.label || '' });
  }

  async function saveLabel() {
    if (!labelDraft || board.pending) return;
    const visit = visitRevision.current;
    const draft = labelDraft;
    if (await board.updateEdge(draft.id, { label: draft.value.trim() || null }) && visit === visitRevision.current) {
      setLabelDraft((current) => current === draft ? null : current);
    }
  }

  async function saveTitle() {
    if (titleDraft === null || !titleDraft.trim() || titleDraft.trim().length > 80 || board.pending) return;
    const visit = visitRevision.current;
    const draft = titleDraft;
    if (await board.updateBoard({ title: draft.trim() }) && visit === visitRevision.current) {
      setTitleDraft((current) => current === draft ? null : current);
    }
  }

  async function prepareDelete() {
    const visit = visitRevision.current;
    const fromBoard = boardId;
    if (!await commitViewport()) return;
    try {
      await board.flush();
      if (visit === visitRevision.current && fromBoard === routeId.current) setDeleting(true);
    }
    catch { /* The hook presents the save failure. */ }
  }

  async function connect(member: BoardMember) {
    if (board.pending) return;
    if (!visibleMembers.some((current) => current.id === member.id)) return;
    if (!connectFrom || !visibleMembers.some((current) => current.id === connectFrom)) { setConnectFrom(member.id); return; }
    if (connectFrom === member.id) { setConnectFrom(null); return; }
    if (await board.addEdge({ from_member_id: connectFrom, to_member_id: member.id })) setConnectFrom(null);
  }

  function eraseAt(event: { clientX: number; clientY: number; target: EventTarget | null }) {
    const current = gesture.current;
    if (current?.kind !== 'eraser') return;
    const paths = new Set<SVGPathElement>();
    if (event.target instanceof Element) {
      const direct = event.target.closest<SVGPathElement>('[data-eraser-id]');
      if (direct) paths.add(direct);
    }
    const previous = current.previous || { x: event.clientX, y: event.clientY };
    const dx = event.clientX - previous.x; const dy = event.clientY - previous.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 4));
    // Pointer capture retargets events to the surface. Hit-test the same transparent
    // stroke paths in their own coordinate systems so captured sweeps still erase.
    surface.current?.querySelectorAll<SVGPathElement>('[data-eraser-id]').forEach((path) => {
      if (!path.isPointInStroke || !path.getScreenCTM) return;
      const matrix = path.getScreenCTM();
      if (!matrix) return;
      const inverse = matrix.inverse();
      for (let step = 0; step <= steps; step += 1) {
        const point = new DOMPoint(previous.x + dx * step / steps, previous.y + dy * step / steps).matrixTransform(inverse);
        if (path.isPointInStroke(point)) { paths.add(path); break; }
      }
    });
    current.previous = { x: event.clientX, y: event.clientY };
    paths.forEach((path) => { if (path.dataset.eraserId) current.ids.add(path.dataset.eraserId); });
    setErasedIds(new Set(current.ids));
  }

  function begin(event: React.PointerEvent, object?: MoveObject | BoardEdge, resize = false) {
    if (event.button !== 0 && event.button !== 1) return;
    if (!detail || !viewportRef.current || chalkDraft || deleteKeys) return;
    if (cancelViewportAnimation.current) {
      cancelViewportAnimation.current();
      cancelViewportAnimation.current = null;
      void commitViewport();
    }
    event.preventDefault();
    event.stopPropagation();
    surface.current?.focus();
    setBoardHoverKey(null);
    const start = localPoint(event);
    const current = viewportRef.current;
    setAlignmentGuides([]);
    gestureRevision.current += 1;
    if (event.button === 1 || spaceDown.current || tool === 'pan') {
      gesture.current = { kind: 'pan', start, viewport: current };
    } else if (tool === 'pen') {
      const points = [toBoardPoint(start, current)];
      gesture.current = { kind: 'pen', points, layer_id: activeLayerId };
      setInk(points);
      setSelection(null);
    } else if (tool === 'eraser') {
      gesture.current = { kind: 'eraser', ids: new Set() };
      setSelection(null);
      eraseAt(event);
    } else if (object) {
      const kind = 'visual_kind' in object ? 'visual' : 'member_kind' in object ? 'member' : 'edge';
      const target: BoardSelection = { kind, id: object.id };
      if (tool === 'connect') { if ('member_kind' in object) void connect(object); return; }
      if ((event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) && !resize) { selectWithModifiers(target, event); return; }
      const keepSelection = selectedKeys.has(selectionKey(target)) && !resize;
      selectObject(target, false, keepSelection);
      if (resize && 'pinned' in object) {
        if (object.pinned || ('visual_kind' in object && (object.visual_kind === 'freehand' || object.visual_kind === 'connector'))) return;
        gesture.current = { kind: 'resize', start, object };
        objectDraftRef.current = object;
        setObjectDraft(object);
      } else {
        const keys = keepSelection ? selectedKeys : new Set([selectionKey(target)]);
        const objects = [...visibleMembers, ...visibleVisuals].filter((entry) => keys.has(selectionKey({
          kind: 'member_kind' in entry ? 'member' : 'visual', id: entry.id,
        })));
        const pinnedCount = objects.filter((entry) => entry.pinned).length;
        setSelectionNotice(pinnedCount ? `Skipped ${pinnedCount} pinned ${pinnedCount === 1 ? 'object' : 'objects'}.` : null);
        const movable = objects.filter((entry) => !entry.pinned);
        if (!movable.length) return;
        const bounds = (entry: MoveObject): BoardRect => 'visual_kind' in entry ? visualBounds(entry)
          : { x: entry.x, y: entry.y, w: entry.w * entry.scale, h: entry.h * entry.scale };
        const movingIds = new Set(movable.map((entry) => entry.id));
        // Use the grabbed object, even when scene order differs from selection order.
        const primary = movable.find((entry) => entry.id === object.id) || movable[0];
        gesture.current = { kind: 'move', start, point: start, objects: movable, primary: bounds(primary), moved: false,
          targets: [...visibleMembers, ...visibleVisuals].filter((entry) => !movingIds.has(entry.id)).map(bounds) };
        groupDraftsRef.current = new Map(movable.map((entry) => [entry.id, entry]));
        setGroupDrafts(new Map(groupDraftsRef.current));
      }
    } else if (tool === 'select') {
      setConnectFrom(null);
      setSelectionNotice(null);
      const point = toBoardPoint(start, current);
      const mode = event.altKey ? 'subtract' : event.shiftKey || event.ctrlKey || event.metaKey ? 'add' : 'replace';
      gesture.current = { kind: 'marquee', start: point, base: new Set(selectedKeys), mode };
      setMarquee(selectionRect(point, point));
      if (mode === 'replace') setSelection(null);
    } else { setSelection(null); setConnectFrom(null); return; }
    capturedPointer.current = object && tool !== 'eraser' ? event.currentTarget : surface.current;
    capturedPointer.current?.setPointerCapture(event.pointerId);
  }

  function updateMoveDraft(current: Extract<Gesture, { kind: 'move' }>, point: BoardPoint, bypass: boolean) {
    if (!viewportRef.current) return;
    current.point = point;
    const delta = { x: (point.x - current.start.x) / viewportRef.current.zoom,
      y: (point.y - current.start.y) / viewportRef.current.zoom };
    current.moved ||= delta.x !== 0 || delta.y !== 0;
    // A selection click is not a geometry edit, even when an object is near a guide.
    const snapped = bypass || !current.moved ? { delta, guides: [] }
      : snapBoardTranslation(current.primary, delta, current.targets, viewportRef.current.zoom);
    groupDraftsRef.current = new Map(current.objects.map((object) => [object.id,
      { ...object, x: object.x + snapped.delta.x, y: object.y + snapped.delta.y }]));
    setGroupDrafts(new Map(groupDraftsRef.current));
    setAlignmentGuides(snapped.guides);
  }

  function move(event: React.PointerEvent) {
    const current = gesture.current;
    if (!current || !viewportRef.current) return;
    const point = localPoint(event);
    if (current.kind === 'pan') {
      changeViewport({ ...current.viewport, x: current.viewport.x + point.x - current.start.x,
        y: current.viewport.y + point.y - current.start.y }, false);
    } else if (current.kind === 'eraser') {
      eraseAt(event);
    } else if (current.kind === 'marquee') {
      const rect = selectionRect(current.start, toBoardPoint(point, viewportRef.current));
      setMarquee(rect);
      const hits = marqueeSelection(rect, { members: visibleMembers, visuals: visibleVisuals, edges: visibleEdges });
      const keys = current.mode === 'replace' ? new Set<string>() : new Set(current.base);
      hits.forEach((hit) => current.mode === 'subtract' ? keys.delete(selectionKey(hit)) : keys.add(selectionKey(hit)));
      setSelectionState(selectionFromKeys(keys));
    } else if (current.kind === 'pen') {
      current.points = [...current.points, toBoardPoint(point, viewportRef.current)];
      setInk(current.points);
    } else {
      const dx = (point.x - current.start.x) / viewportRef.current.zoom;
      const dy = (point.y - current.start.y) / viewportRef.current.zoom;
      if (current.kind === 'move') {
        updateMoveDraft(current, point, event.shiftKey);
      } else {
        const object = current.object;
        const visual = 'visual_kind' in object;
        const next = { ...object, w: Math.max(visual ? 16 : 160, object.w + dx / object.scale),
          h: Math.max(visual ? 16 : 100, object.h + dy / object.scale) };
        objectDraftRef.current = next;
        setObjectDraft(next);
      }
    }
  }

  async function end(event: React.PointerEvent, cancel = false) {
    const current = gesture.current;
    const revision = gestureRevision.current;
    // Include the release position/modifier, then remove guides before awaiting a save.
    // An older save completion must never clear a newer gesture's guides.
    if (current?.kind === 'move' && !cancel) updateMoveDraft(current, localPoint(event), event.shiftKey);
    setAlignmentGuides([]);
    if (current?.kind === 'eraser' && !cancel) eraseAt(event);
    gesture.current = null;
    if (capturedPointer.current?.hasPointerCapture(event.pointerId)) capturedPointer.current.releasePointerCapture(event.pointerId);
    capturedPointer.current = null;
    if (!current) return;
    if (current.kind === 'pan') {
      if (cancel) changeViewport(current.viewport, false);
      await commitViewport();
    } else if (current.kind === 'marquee') {
      setMarquee(null);
      if (cancel) {
        setSelectionState(selectionFromKeys(current.base));
      }
    } else if (current.kind === 'eraser') {
      if (!cancel && current.ids.size) await board.removeVisuals([...current.ids]);
      if (revision === gestureRevision.current) setErasedIds(new Set());
    } else if (current.kind === 'pen') {
      setInk([]);
      if (cancel) return;
      const bounds = current.points.reduce<{ x: number; y: number; right: number; bottom: number }>((box, point) => ({
        x: Math.min(box.x, point.x), y: Math.min(box.y, point.y),
        right: Math.max(box.right, point.x), bottom: Math.max(box.bottom, point.y),
      }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
      const { x, y } = bounds;
      const points = current.points.map((point) => ({ x: point.x - x, y: point.y - y }));
      if (points.length === 1) points.push({ x: points[0].x + 0.01, y: points[0].y });
      await board.addVisual({ visual_kind: 'freehand', x, y, layer_id: current.layer_id,
        w: Math.max(1, bounds.right - x), h: Math.max(1, bounds.bottom - y),
        data: { points, path: pointsPath(points), style: { color_token: 'ink', width: 2.5 } } });
    } else if (current.kind === 'move') {
      const changes = current.objects.flatMap((object) => {
        const next = groupDraftsRef.current.get(object.id);
        return next && (next.x !== object.x || next.y !== object.y) ? [{
          kind: ('member_kind' in object ? 'member' : 'visual') as 'member' | 'visual', id: object.id, input: { x: next.x, y: next.y },
        }] : [];
      });
      if (!cancel && changes.length) await board.updateGeometryBatch(changes);
      if (revision === gestureRevision.current) { groupDraftsRef.current = new Map(); setGroupDrafts(new Map()); }
    } else {
      const next = objectDraftRef.current;
      if (!cancel && next && (next.w !== current.object.w || next.h !== current.object.h)) {
        const patch = { w: next.w, h: next.h };
        if ('visual_kind' in next) await board.updateVisual(next.id, patch);
        else await board.updateMember(next.id, patch);
      }
      if (revision === gestureRevision.current) { objectDraftRef.current = null; setObjectDraft(null); }
    }
  }

  async function executeDeletion(keys: Set<string>) {
    if (!detail) return;
    const visit = visitRevision.current;
    const scope = deletionScope(keys, visibleDetail, detail.edges);
    if (await board.removeSelection(scope) && visit === visitRevision.current) {
      setSelection(null);
      setDeleteKeys(null);
      surface.current?.focus();
    }
  }

  async function removeSelection() {
    if (!selectedKeys.size || !detail || chalkDraft || board.pending) return;
    const scope = deletionScope(selectedKeys, visibleDetail, detail.edges);
    if (scope.memberIds.length) setDeleteKeys(new Set(selectedKeys));
    else await executeDeletion(new Set(selectedKeys));
  }

  function keyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (boardPaused.current || deleteKeys || deleting || chalkDraft || labelDraft) return;
    if ((event.target as HTMLElement).closest('input, select, textarea, [contenteditable="true"], [role="dialog"], dialog')) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Shift' && gesture.current?.kind === 'move') {
      event.preventDefault();
      updateMoveDraft(gesture.current, gesture.current.point, true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && (key === 'z' || key === 'y')) {
      event.preventDefault();
      if (gesture.current) return;
      if (key === 'y' || event.shiftKey) void board.redo(); else void board.undo();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // End an in-progress selection gesture so its next pointermove cannot
      // recreate the selection that Escape just cleared.
      if (gesture.current?.kind === 'marquee') { gesture.current = null; setMarquee(null); }
      setSelection(null); setListHoverKey(null); setBoardHoverKey(null); setFlash(null);
      setConnectFrom(null); setLabelDraft(null); setTool('select');
      return;
    }
    if ((event.target as HTMLElement).closest('button, a')) return;
    if (event.code === 'Space') { event.preventDefault(); spaceDown.current = true; }
    if (event.key === 'Enter' && selectedMember) {
      event.preventDefault();
      if (tool === 'connect') void connect(selectedMember); else void openMember(selectedMember);
    }
    if (event.key === 'Enter' && selectedVisual?.visual_kind === 'sticky') { event.preventDefault(); editChalk(selectedVisual); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedKeys.size) { event.preventDefault(); void removeSelection(); }
    if (selectedMember && !selectedMember.pinned && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (board.pending) return;
      const amount = event.shiftKey ? 10 : 1;
      void board.updateMember(selectedMember.id, {
        x: selectedMember.x + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0),
        y: selectedMember.y + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0),
      });
    }
  }

  // Native non-passive listener makes trackpad/pointer zoom stay inside this board.
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    function wheel(event: WheelEvent) {
      if ((event.target as Element).closest('[data-board-viewport-bookmarks]')) return;
      event.preventDefault();
      if (boardPaused.current) return;
      const current = viewportRef.current;
      if (!current || gesture.current) return;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element!.clientHeight : 1;
      const next = event.ctrlKey || event.metaKey || event.altKey
        ? zoomBoardAt(current, localPoint(event), Math.exp(-event.deltaY * units * 0.002))
        : { ...current, x: current.x - event.deltaX * units, y: current.y - event.deltaY * units };
      changeViewport(next);
    }
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [detail?.board.id]);

  if (!detail) return <section className={styles.loading}>
    <button className={styles.button} onClick={() => navigate('/boards')}><ArrowLeft size={16} />Boards</button>
    <p role={board.error ? 'alert' : 'status'}>{board.error || 'Loading board…'}</p>
    {board.error && <button className={styles.button} onClick={() => { board.clearError(); void board.reload(); }}>Retry board</button>}
  </section>;

  const activeViewport = viewport || detail.board.viewport;
  const matching = candidates.filter((candidate) => `${candidate.title} ${candidate.summary} ${candidate.project_title} ${candidate.item_type || ''} ${candidate.topic || ''}`
    .toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const candidateById = new Map(candidates.map((candidate) => [`${candidate.member_kind}:${candidate.member_id}`, candidate]));
  function zoom(factor: number) {
    changeViewport(zoomBoardAt(viewportRef.current || activeViewport, {
      x: (surface.current?.clientWidth || 800) / 2, y: (surface.current?.clientHeight || 600) / 2,
    }, factor));
  }

  return <><section className={styles.workspace} aria-label="Board workspace" style={skin.style} data-board-skin-preset={skin.preset} onPaste={pasteReference} onKeyDown={keyDown}
    onKeyDownCapture={pauseBoard} onKeyUpCapture={pauseBoard} onPasteCapture={pauseBoard}
    onKeyUp={(event) => {
      if (event.key === 'Shift' && gesture.current?.kind === 'move') {
        updateMoveDraft(gesture.current, gesture.current.point, false);
      }
    }}
    onPointerDownCapture={pauseBoard} onPointerMoveCapture={pauseBoard} onPointerUpCapture={pauseBoard}
    onClickCapture={pauseBoard} onContextMenuCapture={pauseBoard} onDragOverCapture={pauseBoard} onDropCapture={pauseBoard}
    onDoubleClickCapture={(event) => {
      // The visible board edge remains a note-switch target while all other board gestures yield.
      if (newNoteOpen || !(event.target as Element).closest('[data-board-note-switch="true"]')) pauseBoard(event);
    }}>
    {pasteError && <p role="alert">{pasteError}</p>}
    <header className={styles.boardHeader}>
      <button className={styles.button} onClick={() => { void leave('/boards'); }}><ArrowLeft size={16} />Boards</button>
      {titleDraft === null ? <>
        <h1 title={detail.board.title} onDoubleClick={() => { if (!board.pending) setTitleDraft(detail.board.title); }}>{detail.board.title}</h1>
        <button className={styles.button} aria-label="Rename board" disabled={board.pending}
          onClick={() => setTitleDraft(detail.board.title)}><Pencil size={15} /></button>
      </> : <form className={styles.titleEditor} onSubmit={(event) => { event.preventDefault(); void saveTitle(); }}>
        <input ref={titleInput} aria-label="Board name" autoFocus required maxLength={80} value={titleDraft} disabled={board.pending}
          onFocus={(event) => event.currentTarget.select()} onChange={(event) => setTitleDraft(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') setTitleDraft(null); }} />
        <button className={styles.button} type="submit" disabled={board.pending || !titleDraft.trim() || titleDraft.trim().length > 80}>Save name</button>
        <button className={styles.button} type="button" disabled={board.pending} onClick={() => setTitleDraft(null)}>Cancel</button>
      </form>}
      <span className={styles.saveStatus} role="status">{board.error ? 'Changes need attention' : board.pending || viewportDirty ? 'Saving…' : 'Saved'}</span>
      <button ref={newNoteToggle} className={styles.button} disabled={board.pending || Boolean(chalkDraft) || Boolean(openNoteId)}
        onClick={() => { spaceDown.current = false; setPickerOpen(false); setConnectFrom(null); setNewNoteOpen(true); }}>
        <Plus size={16} />New note
      </button>
      <button ref={pickerToggle} className={styles.primaryButton} aria-expanded={pickerOpen} aria-controls="board-note-picker"
        onClick={() => pickerOpen ? closePicker() : openPicker()}><Plus size={16} />Add notes and items</button>
      <button ref={stagingToggle} className={`${styles.button} ${styles.stagingToggle}`} data-board-staging-control="true"
        aria-expanded={stagingOpen} aria-controls="board-staging" onClick={() => stagingOpen ? closeStaging() : openStaging()}>
        <Inbox size={16} />Staging ({stagedMembers.length})
      </button>
      <button ref={layersToggle} className={styles.button} aria-expanded={layersOpen} aria-controls="board-layers"
        disabled={Boolean(chalkDraft) || Boolean(deleteKeys)} onClick={() => layersOpen ? closeLayers() : setLayersOpen(true)}>
        <Layers size={16} />Layers
      </button>
      <details className={styles.boardMenu}>
        <summary aria-label="Board menu">More</summary>
        <div className={styles.boardMenuContent}>
          <details className={styles.boardAppearance} onKeyDown={(event) => event.stopPropagation()}>
            <summary>板面外观</summary>
            <SkinEditor key={boardId} value={skin.selection} inheritedValue={skin.inheritedSelection} save={skin.save} inheritLabel="继承项目 / 全局" surface="board" advanced />
            {skin.error && <p role="alert">{skin.error}<button type="button" onClick={skin.retry}>重试</button></p>}
          </details>
          <section className={styles.boardIdentity} aria-label="Board identity">
            <h2>Board identity</h2>
            {detail.board.identity_item_id ? <>
              <p>Identity Item linked</p>
              <h3>Independent description</h3>
              <p className={styles.identityDescription}>{detail.board.identity_description || 'Description unavailable.'}</p>
              <p className={styles.identityHint}>Renaming the board leaves this description unchanged.</p>
            </> : <p>No identity Item linked.</p>}
          </section>
          <button className={styles.button} disabled={board.pending} onClick={() => { void prepareDelete(); }}>Delete board</button>
        </div>
      </details>
    </header>
    {board.error && <div className={styles.error} role="alert"><span>{board.error}</span>
      <button onClick={() => {
        clearTimeout(viewportTimer.current);
        viewportPending.current = null;
        viewportRef.current = null;
        setViewport(null);
        setViewportDirty(false);
        board.clearError();
        void board.reload();
      }}>Reload saved board</button>
    </div>}
    <div className={styles.toolbar} role="toolbar" aria-label="Board tools">
      {([{ key: 'select', label: 'Select', Icon: MousePointer2 }, { key: 'pan', label: 'Pan', Icon: Hand },
        { key: 'connect', label: 'Connect', Icon: Link2 }, { key: 'pen', label: 'Pen', Icon: Pencil },
        { key: 'eraser', label: 'Eraser', Icon: Eraser }] as const).map(({ key, label, Icon }) =>
        <button key={key} className={styles.button} aria-pressed={tool === key}
          onClick={() => { setTool(key); setConnectFrom(null); }}><Icon size={16} />{label}</button>)}
      <button className={styles.button} aria-label="Undo board action" disabled={!board.canUndo || Boolean(chalkDraft) || Boolean(deleteKeys)} onClick={() => { surface.current?.focus(); void board.undo(); }}><Undo2 size={16} />Undo</button>
      <button className={styles.button} aria-label="Redo board action" disabled={!board.canRedo || Boolean(chalkDraft) || Boolean(deleteKeys)} onClick={() => { surface.current?.focus(); void board.redo(); }}><Redo2 size={16} />Redo</button>
      <span className={styles.toolHint}>{tool === 'connect' ? (connectFrom ? 'Choose the next card' : 'Choose two cards to connect')
        : tool === 'pen' ? 'Draw on the board' : tool === 'eraser' ? 'Sweep to erase whole pen strokes'
          : 'Drag blank space to select · Ctrl-drag to add · Alt-drag to subtract · Ctrl/Shift-click to toggle · Hold Shift after starting an object drag to ignore snapping · Esc to clear · Space-drag to pan'}</span>
      {!activeLayerVisible && <span className={styles.toolHint} role="status">Active layer is hidden. New objects will be hidden.</span>}
      <div className={styles.zoomControls}>
        <button className={styles.button} aria-label="Zoom board out" onClick={() => zoom(1 / 1.2)}><Minus size={16} /></button>
        <button className={styles.button} aria-label="Reset board zoom" onClick={() => zoom(1 / activeViewport.zoom)}>{Math.round(activeViewport.zoom * 100)}%</button>
        <button className={styles.button} aria-label="Zoom board in" onClick={() => zoom(1.2)}><Plus size={16} /></button>
      </div>
    </div>
    <div className={styles.boardBody}>
      {layersOpen && <BoardLayers layers={detail.layers || []} members={detail.members} visuals={detail.visuals}
        activeLayerId={activeLayerId} baseVisible={detail.board.base_layer_visible !== false}
        pending={board.pending || Boolean(chalkDraft)} onSelectLayer={chooseLayer}
        onBaseVisibleChange={(visible) => board.updateBoard({ base_layer_visible: visible })}
        onCreateLayer={async (name) => {
          const visit = visitRevision.current;
          const layer = await board.createLayer({ name });
          if (layer && visit === visitRevision.current) chooseLayer(layer.id);
          return Boolean(layer);
        }}
        onUpdateLayer={board.updateLayer} onReorderLayers={board.reorderLayers} onDeleteLayer={board.deleteLayer} onClose={closeLayers} />}
      {pickerOpen && <aside id="board-note-picker" className={styles.picker} aria-label="Add projections"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closePicker(); }
        }}>
        <div className={styles.pickerHeader}>
          <label htmlFor="board-candidate-search">Notes, groups and items</label>
          <button type="button" className={styles.button} aria-label="Close note picker" title="Close note picker"
            onClick={closePicker}><X size={16} /></button>
        </div>
        <input id="board-candidate-search" type="search" value={search} placeholder="Search your library"
          onChange={(event) => setSearch(event.currentTarget.value)} />
        {candidateLoading ? <p role="status">Loading library…</p> : candidateError ? <div role="alert"><p>{candidateError}</p>
          <button className={styles.button} onClick={() => { void loadCandidates(); }}>Retry library</button></div>
          : matching.length === 0 ? <p>No matching notes, groups or items.</p> : (
            [{ kind: 'note', label: 'Notes' }, { kind: 'content_group', label: 'Groups' }, { kind: 'item', label: 'Items' }] as const
          ).map(({ kind, label }) => {
            const entries = matching.filter((candidate) => candidate.member_kind === kind);
            return entries.length > 0 && <section key={kind} aria-label={label} className={styles.candidateGroup}>
              <h2>{label}</h2><ul>{entries.map((candidate) =>
            <li key={`${candidate.member_kind}:${candidate.member_id}`}><button className={styles.candidate}
              disabled={board.pending} aria-label={`Add ${candidate.title} to board`}
              onClick={() => {
                const position = defaultMemberPosition();
                void board.mount({ id: crypto.randomUUID(), member_kind: candidate.member_kind, member_id: candidate.member_id,
                  x: position.x, y: position.y, w: 260, h: 156, scale: 1,
                  z_index: nextMemberZ(), layer_id: activeLayerId });
              }}>
              <strong>{candidate.title}</strong><span>{candidate.summary || 'Open the note to read more.'}</span>
              <small>{candidate.member_kind === 'item' ? [candidate.item_type, candidate.topic].filter(Boolean).join(' · ') || 'Item'
                : candidate.member_kind === 'note' ? 'Note' : 'Group'} · {candidate.project_title}</small>
            </button><button type="button" className={styles.stageCandidate} disabled={board.pending}
              aria-label={`Stage ${candidate.title}`} onClick={() => { void stageCandidate(candidate); }}>Stage</button></li>)}</ul></section>;
          })}
      </aside>}
      <div className={`${styles.surface} ${tool === 'pen' || tool === 'eraser' ? styles.penSurface : ''}`} ref={surface}
        data-testid="board-surface" tabIndex={0} aria-label="Board canvas"
        onKeyUp={(event) => { if (event.code === 'Space') spaceDown.current = false; }}
        onBlur={() => { spaceDown.current = false; }}
        onDoubleClick={draftChalk}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(BOARD_STAGING_MIME) || board.pending || chalkDraft) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={dropStagedMember}
        onPointerDown={(event) => begin(event)} onPointerMove={(event) => { hoverBoard(event); move(event); }}
        onPointerOver={hoverBoard} onPointerLeave={() => setBoardHoverKey(null)}
        onPointerUp={(event) => { void end(event); }} onPointerCancel={(event) => { void end(event, true); }}>
        <div className={styles.world} data-testid="board-world"
          style={{ transform: `translate(${activeViewport.x}px, ${activeViewport.y}px) scale(${activeViewport.zoom})` }}>
          {scene.containers.map((layer) => <div key={layer.id || 'base'} className={styles.layer}
            data-board-layer={layer.id || 'base'} aria-label={`Layer ${layer.name}`} style={{ zIndex: layer.rank }}>
          <svg className={styles.connections} aria-label="Board connections and ink"
            style={labelDraft ? { zIndex: Math.max(0, ...layer.members.map((member) => member.z_index), ...layer.visuals.map((visual) => visual.z_index)) + 1 } : undefined}>
            <defs><marker id={layer.id ? `board-edge-arrow-${layer.id}` : 'board-edge-arrow'} viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--board-edge, var(--text-secondary))" />
            </marker></defs>
            {layer.edges.map((edge) => {
              const from = visibleMembers.find((member) => member.id === edge.from_member_id);
              const to = visibleMembers.find((member) => member.id === edge.to_member_id);
              if (!from || !to) return null;
              const start = connectionPoint(from, to);
              const finish = connectionPoint(to, from);
              const path = `M ${start.x} ${start.y} L ${finish.x} ${finish.y}`;
              return <g key={edge.id} {...selectionEmphasis('edge', edge.id)}>
                <path d={path} data-testid={`board-edge-${edge.id}`}
                  markerStart={edge.style.direction === 'both' ? `url(#${layer.id ? `board-edge-arrow-${layer.id}` : 'board-edge-arrow'})` : undefined}
                  markerEnd={edge.style.direction === 'forward' || edge.style.direction === 'both' ? `url(#${layer.id ? `board-edge-arrow-${layer.id}` : 'board-edge-arrow'})` : undefined}
                  className={isSelected('edge', edge.id) ? styles.selectedLine : styles.edgeLine} />
                {tool === 'select' && <path d={path} className={styles.lineHit} role="button" tabIndex={0}
                  aria-label={`Connection ${from.reference.title || 'note'} to ${to.reference.title || 'note'}`}
                  onFocus={() => focusSelection({ kind: 'edge', id: edge.id })}
                  onPointerDown={(event) => begin(event, edge)}
                  onDoubleClick={(event) => { event.stopPropagation(); editLabel(edge); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectWithModifiers({ kind: 'edge', id: edge.id }, event); } }} />}
                {labelDraft?.id === edge.id ? <foreignObject x={(start.x + finish.x) / 2 - 140}
                  y={(start.y + finish.y) / 2 - 30} width="280" height="80" className={styles.edgeEditor}
                  onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
                  <form onSubmit={(event) => { event.preventDefault(); void saveLabel(); }}>
                    <input aria-label="Connection label" autoFocus maxLength={4000} value={labelDraft.value} disabled={board.pending}
                      onChange={(event) => setLabelDraft({ id: edge.id, value: event.currentTarget.value })}
                      onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') setLabelDraft(null); }} />
                    <button className={styles.button} disabled={board.pending} type="submit">Save label</button>
                    <button className={styles.button} type="button" disabled={board.pending} onClick={() => setLabelDraft(null)}>Cancel</button>
                  </form>
                </foreignObject> : edge.label && <text x={(start.x + finish.x) / 2} y={(start.y + finish.y) / 2 - 8} className={styles.edgeLabel}>{edge.label}</text>}
              </g>;
            })}
            {layer.visuals.filter((visual) => visual.visual_kind === 'freehand').map((visual) => <g key={visual.id} data-testid={`board-visual-${visual.id}`}
              {...selectionEmphasis('visual', visual.id)}
              style={erasedIds.has(visual.id) ? { opacity: 0.2 } : undefined}
              transform={`translate(${visual.x} ${visual.y}) rotate(${visual.rotation}) scale(${visual.scale})`}>
              <path d={strokePath(visual)} className={isSelected('visual', visual.id) ? styles.selectedLine : styles.inkLine} />
              {(tool === 'select' || tool === 'eraser') && <path d={strokePath(visual)} className={styles.lineHit} role="button" tabIndex={tool === 'select' ? 0 : -1}
                data-eraser-id={visual.id} aria-label={tool === 'eraser' ? 'Erase drawing' : 'Select drawing'} onPointerDown={(event) => begin(event, visual)}
                onFocus={() => { if (tool === 'select') focusSelection({ kind: 'visual', id: visual.id }); }}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectWithModifiers({ kind: 'visual', id: visual.id }, event); } }} />}
            </g>)}
            {ink.length > 0 && layer.id === (gesture.current?.kind === 'pen' ? gesture.current.layer_id : activeLayerId) && <path d={pointsPath(ink)} className={styles.inkLine} />}
          </svg>
          {layer.visuals.filter((visual) => visual.visual_kind !== 'freehand' && visual.visual_kind !== 'sticky').map((visual) =>
            <BoardRelocatedVisual key={visual.id} visual={visual} selected={isSelected('visual', visual.id)}
              emphasis={selectionEmphasis('visual', visual.id)}
              selectable={tool === 'select'} onSelect={(event) => event?.type === 'keydown' ? selectWithModifiers({ kind: 'visual', id: visual.id }, event as React.KeyboardEvent) : focusSelection({ kind: 'visual', id: visual.id })}
              onPointerDown={(event) => begin(event, visual)} onResize={(event) => begin(event, visual, true)} />)}
          {layer.visuals.filter((visual) => visual.visual_kind === 'sticky' && visual.id !== chalkDraft?.id).map((visual) =>
            <div key={visual.id} {...selectionEmphasis('visual', visual.id)}
              className={`${styles.chalk} ${isSelected('visual', visual.id) ? styles.selected : ''} ${selectionEmphasis('visual', visual.id).className}`}
              style={chalkGeometry(visual)} data-testid={`board-visual-${visual.id}`} data-visual-kind="sticky"
              role={tool === 'select' ? 'button' : undefined} tabIndex={tool === 'select' ? 0 : undefined}
              aria-label="Select chalk" title={visual.pinned ? 'Pinned chalk · Double-click to edit' : 'Double-click to edit chalk'}
              onFocus={() => { if (tool === 'select') focusSelection({ kind: 'visual', id: visual.id }); }}
              onPointerDown={(event) => begin(event, visual)}
              onDoubleClick={(event) => { event.stopPropagation(); editChalk(visual); }}>
              <p>{typeof visual.data.text === 'string' ? visual.data.text : ''}</p>
            </div>)}
          {chalkDraft && layerIdOf(chalkDraft) === layer.id && <BoardChalkEditor key={chalkDraft.id || 'new'} draft={chalkDraft}
            onSave={saveChalk} onCancel={() => setChalkDraft(null)} />}
          {layer.members.map((member) => {
            const candidate = candidateById.get(`${member.member_kind}:${member.member_id}`);
            const isItem = member.member_kind === 'item';
            const isTextRange = member.member_kind === 'text_range';
            const title = member.reference.title || (isItem ? member.reference.item_type || 'Item' : candidate?.title)
              || (isTextRange ? 'Source note unavailable' : 'Unavailable projection');
            const canOpen = (isTextRange || member.reference.state === 'available') && Boolean(member.reference.note_id);
            const openHint = isItem && !member.reference.note_id
              ? 'This item has no origin note. Double-click is unavailable.' : undefined;
            return <article key={member.id} data-testid={`board-member-${member.id}`} tabIndex={0}
              {...selectionEmphasis('member', member.id)}
              data-board-note-switch={member.member_kind === 'note' && canOpen ? 'true' : undefined}
              aria-label={title}
              aria-disabled={!canOpen}
              title={openHint}
              className={`${styles.member} ${isItem || isTextRange ? styles.referenceMember : ''} ${isSelected('member', member.id) || connectFrom === member.id ? styles.selected : ''} ${selectionEmphasis('member', member.id).className}`}
              style={{ left: member.x, top: member.y, width: member.w, height: member.h,
                transform: `scale(${member.scale})`, zIndex: member.z_index }}
              onPointerDown={(event) => begin(event, member)}
              onFocus={() => focusSelection({ kind: 'member', id: member.id })}
              onDoubleClick={canOpen ? (event) => {
                event.stopPropagation();
                if (tool !== 'select') return;
                if (member.member_kind === 'note') openNote(member);
                else void openMember(member);
              } : undefined}>
              {isItem || isTextRange ? <>
                <div className={styles.referenceCorner}><BoardReferenceTag member={member}
                  noteTitle={candidates.find((entry) => entry.member_kind === 'note' && entry.member_id === member.reference.note_id)?.title}
                  onOpenSource={canOpen ? () => { void openMember(member); } : undefined} />
                  {member.pinned && <Pin size={13} aria-label="Pinned" />}</div>
                <p className={styles.referenceBody}>{isTextRange ? member.reference.summary || 'Text snapshot unavailable.'
                  : member.reference.plain_text ?? member.reference.summary ?? 'This content is no longer available.'}</p>
              </> : <>
              <div className={styles.memberKind}>{{ note: 'Note', content_group: 'Group', item: 'Item', text_range: 'Text range' }[member.member_kind]}
                {member.pinned && <Pin size={13} aria-label="Pinned" />}</div>
              <h2>{title}</h2>
              <p>{member.reference.state !== 'available' ? (member.reference.state === 'missing' ? 'This content is no longer available.' : 'This content is currently unavailable.')
                  : member.member_kind === 'note' && member.reference.note_id && notePreviews[member.reference.note_id] !== undefined
                    ? notePreviews[member.reference.note_id] || 'This note is empty.'
                  : candidate?.summary || (candidateError ? 'Preview unavailable. Open the note to read.' : 'Open the note to read more.')}</p>
              {!member.reference.note_id && <small>No linked note to open</small>}
              </>}
              {!member.pinned && tool === 'select' && <button type="button" className={`${styles.resizeHandle} ${styles.memberResizeHandle}`}
                aria-label={`Resize ${member.reference.title || 'projection'}`} title="Resize card"
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => begin(event, member, true)}>
                <MoveDiagonal2 size={16} aria-hidden="true" />
              </button>}
            </article>;
          })}
          </div>)}
          {marquee && <div className={styles.marquee} data-testid="board-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
        </div>
        {alignmentGuides.length > 0 && <svg className={styles.alignmentGuides} data-testid="board-alignment-guides" aria-hidden="true">
          {alignmentGuides.map((guide) => <line key={guide.axis} data-axis={guide.axis}
            x1={activeViewport.x + (guide.axis === 'x' ? guide.position : guide.start) * activeViewport.zoom}
            x2={activeViewport.x + (guide.axis === 'x' ? guide.position : guide.end) * activeViewport.zoom}
            y1={activeViewport.y + (guide.axis === 'y' ? guide.position : guide.start) * activeViewport.zoom}
            y2={activeViewport.y + (guide.axis === 'y' ? guide.position : guide.end) * activeViewport.zoom} />)}
        </svg>}
        <BoardViewportBookmarks key={detail.board.id} boardId={detail.board.id}
          getViewport={() => viewportRef.current || activeViewport} onJump={jumpViewport}
          disabled={Boolean(chalkDraft || deleteKeys || openNoteId || newNoteOpen)} />
        {detail.members.every((member) => member.placed === false) && detail.visuals.length === 0 && !chalkDraft && <div className={styles.canvasEmpty}>
          <h2>Give this thought some room.</h2><p>Double-click blank space to write chalk, add a note, or pick up the pen.</p>
          <button className={styles.button} onPointerDown={(event) => event.stopPropagation()} onClick={openPicker}>Add your first note or item</button>
        </div>}
      </div>
      {stagingOpen && <BoardStaging boardId={detail.board.id} members={stagedMembers} candidates={candidates}
        busy={board.pending || Boolean(chalkDraft)} onClose={closeStaging}
        onPlace={(member) => { void placeMember(member); }}
        onRemove={(member) => { void board.unmount(member.id); }} />}
      {selectionListOpen && <BoardSelectionSidebar detail={visibleDetail} selectedKeys={selectedKeys}
        strokeOrder={new Map(detail.visuals.filter((visual) => visual.visual_kind === 'freehand')
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
          .map((visual, index) => [visual.id, index + 1]))}
        highlightedKey={boardHoverKey} onHover={setListHoverKey} onLocate={locateSelection}
        onRemove={removeSelectionKeys} onClose={closeSelectionList} />}
    </div>
    {selectionNotice && <p className={styles.selectionNotice} role="status">{selectionNotice}</p>}
    {selectedKeys.size > 0 && <div className={styles.selectionBar} role="toolbar" aria-label="Selected projection controls">
      <span>{selectedKeys.size} selected</span>
      <button ref={selectionListToggle} type="button" className={styles.button} aria-label="Selection list"
        aria-expanded={selectionListOpen} aria-controls="board-selection-sidebar"
        onClick={() => {
          if (selectionListOpen) closeSelectionList();
          else { setStagingOpen(false); setSelectionListOpen(true); }
        }}><List size={16} />Selection list</button>
      {(visibleMembers.some((member) => isSelected('member', member.id)) || visibleVisuals.some((visual) => isSelected('visual', visual.id))) &&
        <label className={styles.layerDestination}>Move to layer
          <select aria-label="Move to layer" value="" disabled={board.pending || Boolean(chalkDraft)} onChange={(event) => {
            const layerId = event.currentTarget.value === 'base' ? null : event.currentTarget.value;
            void board.moveSelectionToLayer({ memberIds: visibleMembers.filter((member) => isSelected('member', member.id)).map(({ id }) => id),
              visualIds: visibleVisuals.filter((visual) => isSelected('visual', visual.id)).map(({ id }) => id) }, layerId)
              .then(() => surface.current?.focus());
          }}>
            <option value="" disabled>Choose layer</option>
            {scene.layers.map((layer) => <option key={layer.id || 'base'} value={layer.id || 'base'}>{layer.name}</option>)}
          </select>
        </label>}
      {selectedKeys.size > 1 && <button className={styles.button} onClick={() => { setSelection(null); surface.current?.focus(); }}>Clear selection</button>}
      {selectedVisual?.visual_kind === 'sticky' && <button className={styles.button} disabled={board.pending || Boolean(chalkDraft)}
        onClick={() => { void castChalk(selectedVisual); }}>Cast to item</button>}
      {selectedVisual && <button className={styles.button} disabled={board.pending || Boolean(chalkDraft)} aria-pressed={selectedVisual.pinned}
        onClick={() => { void board.updateVisual(selectedVisual.id, { pinned: !selectedVisual.pinned }); }}>
        <Pin size={15} />{selectedVisual.pinned ? 'Unpin' : 'Pin'}
      </button>}
      {selectedEdge && <>
        <button className={styles.button} disabled={board.pending} onClick={() => editLabel(selectedEdge)}>Edit label</button>
        {([{ value: 'none', label: 'No arrows' }, { value: 'forward', label: 'One-way' }, { value: 'both', label: 'Two-way' }] as const).map(({ value, label }) =>
          <button key={value} className={styles.button} disabled={board.pending}
            aria-pressed={(selectedEdge.style.direction || 'none') === value}
            onClick={() => { void board.updateEdge(selectedEdge.id, { style: { ...selectedEdge.style, direction: value } }); }}>{label}</button>)}
      </>}
      {selectedMember && <>
        <button className={styles.button} disabled={!selectedMember.reference.note_id || (selectedMember.member_kind !== 'text_range' && selectedMember.reference.state !== 'available')} onClick={() => { void openMember(selectedMember); }}><ExternalLink size={15} />Enter note</button>
        <button className={styles.button} disabled={board.pending} aria-pressed={selectedMember.pinned} onClick={() => { void board.updateMember(selectedMember.id, { pinned: !selectedMember.pinned }); }}><Pin size={15} />{selectedMember.pinned ? 'Unpin' : 'Pin'}</button>
        <button className={styles.button} aria-label="Shrink projection" disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { scale: Math.max(0.1, selectedMember.scale / 1.1) }); }}><Minus size={15} /></button>
        <span>{Math.round(selectedMember.scale * 100)}%</span>
        <button className={styles.button} aria-label="Enlarge projection" disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { scale: Math.min(10, selectedMember.scale * 1.1) }); }}><Plus size={15} /></button>
        <button className={styles.button} disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { z_index: Math.max(...visibleMembers.map((member) => member.z_index)) + 1 }); }}>Bring forward</button>
        <button className={styles.button} disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { z_index: Math.min(...visibleMembers.map((member) => member.z_index)) - 1 }); }}>Send back</button>
      </>}
      <button className={styles.button} disabled={board.pending || Boolean(chalkDraft)} onClick={() => { void removeSelection(); }}><Trash2 size={15} />{selectedKeys.size > 1 ? 'Delete selected' : selection?.kind === 'member' ? 'Remove from board' : selection?.kind === 'edge' ? 'Delete connection' : selectedVisual?.visual_kind === 'sticky' ? 'Delete chalk' : 'Delete drawing'}</button>
    </div>}
    {deleteKeys && (() => {
      const scope = deletionScope(deleteKeys, visibleDetail, detail.edges);
      return <dialog ref={groupDeleteDialog} className={styles.deleteDialog} aria-labelledby="delete-selection-title"
        aria-describedby="delete-selection-scope" onKeyDown={(event) => event.stopPropagation()}
        onCancel={(event) => { event.preventDefault(); if (!board.pending) { setDeleteKeys(null); surface.current?.focus(); } }}>
        <h2 id="delete-selection-title">Remove selected objects?</h2>
        <div id="delete-selection-scope">
          <p>{scope.memberIds.length} {scope.memberIds.length === 1 ? 'card' : 'cards'} and {scope.connectedEdgeCount} connected {scope.connectedEdgeCount === 1 ? 'edge' : 'edges'} will be removed from the board. This cannot be undone.</p>
          <p>{scope.reversibleCount} {scope.reversibleCount === 1 ? 'drawing or independent connection' : 'drawings and independent connections'} will be deleted. This can be undone.</p>
        </div>
        {board.error && <p role="alert">{board.error}</p>}
        <div className={styles.dialogActions}>
          <button className={styles.button} autoFocus disabled={board.pending} onClick={() => { setDeleteKeys(null); surface.current?.focus(); }}>Cancel</button>
          <button className={styles.button} disabled={board.pending} onClick={() => { void executeDeletion(deleteKeys); }}>{board.pending ? 'Removing…' : 'Remove selected'}</button>
        </div>
      </dialog>;
    })()}
    {deleting && <BoardDeleteDialog board={detail.board} onCancel={() => setDeleting(false)} onDeleted={() => navigate('/boards')} />}
  </section>
    {newNoteOpen && <BoardNewNoteDialog key={boardId} boardId={detail.board.id} initialProjectId={detail.board.project_id} skinStyle={skin.style}
      onCancel={() => { setNewNoteOpen(false); newNoteToggle.current?.focus(); }}
      onCreated={(noteId) => { setNewNoteOpen(false); setOpenNoteId(noteId); void loadCandidates(); }} />}
    {openNoteId && <BoardNoteModal key={openNoteId} ref={noteModal} noteId={openNoteId} skinStyle={skin.style}
      stagingOpen={stagingOpen} onSendToStaging={stageTextRange}
      stagingItemDrop={stagingOpen && !board.pending && !chalkDraft ? {
        boardId: detail.board.id,
        items: stagedMembers.filter((member) => member.member_kind === 'item' && member.reference.state === 'available')
          .map((member) => ({ memberId: member.id, itemId: member.member_id })),
      } : undefined}
      onClosed={() => { setOpenNoteId(null); refreshProjections(openNoteId); }}
      onSwitchNote={(noteId) => { setOpenNoteId(noteId); refreshProjections(openNoteId); }}
      onOpenFullPage={(noteId) => { setOpenNoteId(null); void leave(`/notes/${encodeURIComponent(noteId)}`); }} />}
  </>;
}
