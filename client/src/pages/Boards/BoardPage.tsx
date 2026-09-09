import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hand, Link2, MousePointer2, Pencil, Plus, Minus, Pin, Trash2, ExternalLink, X, Inbox } from 'lucide-react';
import { boardErrorMessage, loadBoardCandidates, loadBoardNotePreview } from './boardRepository';
import type { BoardCandidate, BoardEdge, BoardMember, BoardViewport, BoardVisual } from './boardTypes';
import { pointsPath, toBoardPoint, zoomBoardAt, type BoardPoint } from './boardViewport';
import { useBoard } from './useBoard';
import { BoardRelocatedVisual } from './BoardRelocatedVisual';
import { BoardDeleteDialog } from './BoardDeleteDialog';
import { BoardChalkEditor, chalkGeometry, type ChalkDraft } from './BoardChalk';
import BoardNoteModal, { type BoardNoteModalHandle } from './BoardNoteModal';
import { BoardStaging, BOARD_STAGING_MIME } from './BoardStaging';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';
import { itemOriginLabel } from '@/services/itemSummaryReader';
import { BOARD_TEXT_RANGE_MIME, parseBoardTextRangeClipboard } from './boardTextRangeClipboard';
import styles from './Boards.module.css';

type Tool = 'select' | 'pan' | 'connect' | 'pen';
type Selection = { kind: 'member' | 'edge' | 'visual'; id: string } | null;
type Gesture =
  | { kind: 'pan'; start: BoardPoint; viewport: BoardViewport }
  | { kind: 'move' | 'resize'; start: BoardPoint; object: BoardMember | BoardVisual }
  | { kind: 'pen'; points: BoardPoint[] };

function strokePath(visual: BoardVisual): string {
  if (typeof visual.data.path === 'string') return visual.data.path;
  if (!Array.isArray(visual.data.points)) return '';
  return pointsPath(visual.data.points.filter((point): point is BoardPoint => Boolean(point
    && typeof point.x === 'number' && typeof point.y === 'number')));
}

function connectionPoint(member: BoardMember, other: BoardMember): BoardPoint {
  const center = { x: member.x + member.w * member.scale / 2, y: member.y + member.h * member.scale / 2 };
  const dx = other.x + other.w * other.scale / 2 - center.x;
  const dy = other.y + other.h * other.scale / 2 - center.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return center;
  const reach = Math.min(dx ? member.w * member.scale / 2 / Math.abs(dx) : Infinity,
    dy ? member.h * member.scale / 2 / Math.abs(dy) : Infinity) + 6 / distance;
  return { x: center.x + dx * reach, y: center.y + dy * reach };
}

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const board = useBoard(boardId);
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<BoardCandidate[]>([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const candidateRevision = useRef(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<{ id: string; value: string } | null>(null);
  const [chalkDraft, setChalkDraft] = useState<ChalkDraft | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [notePreviews, setNotePreviews] = useState<Record<string, string>>({});
  const notePreviewRevisions = useRef(new Map<string, number>());
  const noteModal = useRef<BoardNoteModalHandle>(null);
  const openNoteIdRef = useRef<string | null>(null);
  openNoteIdRef.current = openNoteId;
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
    setConnectFrom(null);
    gesture.current = null;
    setObjectDraft(null);
    objectDraftRef.current = null;
    setTitleDraft(null);
    setLabelDraft(null);
    setChalkDraft(null);
    setOpenNoteId(null);
    setNotePreviews({});
    notePreviewRevisions.current.clear();
    setDeleting(false);
    setStagingOpen(false);
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
      clearTimeout(viewportTimer.current);
      const pending = viewportPending.current;
      viewportPending.current = null;
      if (pending) void updateForThisBoard({ viewport: pending });
    };
  }, [boardId, board.updateBoard]);

  function changeViewport(next: BoardViewport, debounce = true) {
    viewportRef.current = next;
    setViewport(next);
    viewportPending.current = next;
    setViewportDirty(true);
    clearTimeout(viewportTimer.current);
    if (debounce) viewportTimer.current = setTimeout(() => { void commitViewport(); }, 200);
  }

  async function leave(path: string) {
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
    if (!openNoteIdRef.current) return;
    if ((event.target as Element).closest('[data-board-staging="true"], [data-board-staging-control="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
  }

  async function pasteReference(event: React.ClipboardEvent<HTMLElement>) {
    if (openNoteIdRef.current) return;
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
    if (openNoteIdRef.current || visit !== visitRevision.current) return;
    if (!raw && !blob && reference?.excerpt !== pastedText) return;
    if (!reference) {
      setPasteError('This board reference could not be read. Select the passage and copy it again.');
      return;
    }
    setPasteError(null);
    void board.mountTextRange({
      text_range: reference, x: point.x - 160, y: point.y - 110, w: 320, h: 220,
      z_index: nextMemberZ(),
    });
  }

  function localPoint(event: { clientX: number; clientY: number }): BoardPoint {
    const rect = surface.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const stagedMembers = (detail?.members || []).filter((member) => member.placed === false);
  const visibleMembers = (detail?.members || []).filter((member) => member.placed !== false)
    .map((member) => objectDraft?.id === member.id && 'member_kind' in objectDraft ? objectDraft : member);
  const visibleVisuals = (detail?.visuals || []).map((visual) => objectDraft?.id === visual.id && 'visual_kind' in objectDraft ? objectDraft : visual);
  const visibleEdges = (detail?.edges || []).filter((edge) => visibleMembers.some((member) => member.id === edge.from_member_id)
    && visibleMembers.some((member) => member.id === edge.to_member_id));
  const selectedMember = selection?.kind === 'member' ? visibleMembers.find(({ id }) => id === selection.id) : undefined;
  const selectedVisual = selection?.kind === 'visual' ? visibleVisuals.find(({ id }) => id === selection.id) : undefined;
  const selectedEdge = selection?.kind === 'edge' ? visibleEdges.find(({ id }) => id === selection.id) : undefined;

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
    if (saved && visit === visitRevision.current) setStagingOpen(true);
  }

  async function stageTextRange(text_range: BoardTextRangeSelection) {
    const visit = visitRevision.current;
    const saved = await board.mountTextRange({ text_range, placed: false });
    if (saved && visit === visitRevision.current) setStagingOpen(true);
    return saved;
  }

  async function placeMember(member: BoardMember, point = defaultMemberPosition()) {
    if (board.pending || chalkDraft || !detail?.members.some((current) => current.id === member.id && current.placed === false)) return;
    const visit = visitRevision.current;
    // Unplaced geometry has no meaning. Assign a complete placement in the one PATCH.
    const saved = await board.updateMember(member.id, { placed: true, x: point.x, y: point.y,
      w: member.member_kind === 'text_range' ? 320 : 260, h: member.member_kind === 'text_range' ? 220 : 156,
      scale: 1, pinned: false, z_index: nextMemberZ() });
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

  function draftChalk(event: React.MouseEvent<HTMLDivElement>) {
    if (tool !== 'select' || spaceDown.current || !detail || chalkDraft) return;
    // Disabled note/item projections and drawing controls are still occupied space.
    if ((event.target as Element).closest('article, [data-visual-kind], [data-testid^="board-visual-"], button, input, textarea, [role="button"]')) return;
    const point = toBoardPoint(localPoint(event), viewportRef.current || detail.board.viewport);
    setSelection(null);
    setChalkDraft({ text: '', x: point.x, y: point.y, w: 240, h: 160, scale: 1, pinned: false,
      z_index: nextMemberZ() });
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
      ? await board.updateVisual(draft.id, { data: { text } })
      : await board.addVisual({ visual_kind: 'sticky', data: { text },
        x: draft.x, y: draft.y, w: draft.w, h: draft.h, scale: draft.scale, z_index: draft.z_index });
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
    if (member.placed === false) return;
    if (!connectFrom || !visibleMembers.some((current) => current.id === connectFrom)) { setConnectFrom(member.id); return; }
    if (connectFrom === member.id) { setConnectFrom(null); return; }
    if (await board.addEdge({ from_member_id: connectFrom, to_member_id: member.id })) setConnectFrom(null);
  }

  function begin(event: React.PointerEvent, object?: BoardMember | BoardVisual, resize = false) {
    if (event.button !== 0 && event.button !== 1) return;
    if (!detail || !viewportRef.current) return;
    if (chalkDraft) return;
    event.preventDefault();
    event.stopPropagation();
    surface.current?.focus();
    const start = localPoint(event);
    const current = viewportRef.current;
    gestureRevision.current += 1;
    if (event.button === 1 || spaceDown.current || tool === 'pan') {
      gesture.current = { kind: 'pan', start, viewport: current };
    } else if (tool === 'pen') {
      const points = [toBoardPoint(start, current)];
      gesture.current = { kind: 'pen', points };
      setInk(points);
      setSelection(null);
    } else if (object) {
      const kind = 'visual_kind' in object ? 'visual' : 'member';
      setSelection({ kind, id: object.id });
      if (tool === 'connect') { if ('member_kind' in object) void connect(object); return; }
      if (object.pinned) return;
      if (resize && 'visual_kind' in object && (object.visual_kind === 'freehand' || object.visual_kind === 'connector')) return;
      gesture.current = { kind: resize ? 'resize' : 'move', start, object };
      objectDraftRef.current = object;
      setObjectDraft(object);
    } else {
      setSelection(null);
      setConnectFrom(null);
      gesture.current = { kind: 'pan', start, viewport: current };
    }
    // Keep clicks/double-clicks targeted at the member while drag events bubble to the surface.
    capturedPointer.current = object ? event.currentTarget : surface.current;
    capturedPointer.current?.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent) {
    const current = gesture.current;
    if (!current || !viewportRef.current) return;
    const point = localPoint(event);
    if (current.kind === 'pan') {
      changeViewport({ ...current.viewport, x: current.viewport.x + point.x - current.start.x,
        y: current.viewport.y + point.y - current.start.y }, false);
    } else if (current.kind === 'pen') {
      const next = toBoardPoint(point, viewportRef.current);
      current.points = [...current.points, next];
      setInk(current.points);
    } else {
      const dx = (point.x - current.start.x) / viewportRef.current.zoom;
      const dy = (point.y - current.start.y) / viewportRef.current.zoom;
      const object = current.object;
      const visual = 'visual_kind' in object;
      const next = current.kind === 'move'
        ? { ...object, x: object.x + dx, y: object.y + dy }
        : { ...object, w: Math.max(visual ? 16 : 160, object.w + dx / object.scale),
          h: Math.max(visual ? 16 : 100, object.h + dy / object.scale) };
      objectDraftRef.current = next;
      setObjectDraft(next);
    }
  }

  async function end(event: React.PointerEvent, cancel = false) {
    const current = gesture.current;
    const revision = gestureRevision.current;
    gesture.current = null;
    if (capturedPointer.current?.hasPointerCapture(event.pointerId)) capturedPointer.current.releasePointerCapture(event.pointerId);
    capturedPointer.current = null;
    if (!current) return;
    if (current.kind === 'pan') {
      if (cancel) changeViewport(current.viewport, false);
      await commitViewport();
    } else if (current.kind === 'pen') {
      setInk([]);
      if (cancel) return;
      const bounds = current.points.reduce<{ x: number; y: number; right: number; bottom: number }>((box, point) => ({
        x: Math.min(box.x, point.x), y: Math.min(box.y, point.y),
        right: Math.max(box.right, point.x), bottom: Math.max(box.bottom, point.y),
      }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
      const { x, y } = bounds;
      const points = current.points.map((point) => ({ x: point.x - x, y: point.y - y }));
      // A tap leaves a visible dot instead of an invisible one-point path.
      if (points.length === 1) points.push({ x: points[0].x + 0.01, y: points[0].y });
      await board.addVisual({ visual_kind: 'freehand', x, y,
        w: Math.max(1, bounds.right - x), h: Math.max(1, bounds.bottom - y),
        data: { points, path: pointsPath(points), style: { color_token: 'ink', width: 2.5 } } });
    } else {
      const next = objectDraftRef.current;
      if (!cancel && next && (next.x !== current.object.x || next.y !== current.object.y || next.w !== current.object.w || next.h !== current.object.h)) {
        const patch = { x: next.x, y: next.y, w: next.w, h: next.h };
        if ('visual_kind' in next) await board.updateVisual(next.id, patch);
        else await board.updateMember(next.id, patch);
      }
      if (revision === gestureRevision.current) {
        objectDraftRef.current = null;
        setObjectDraft(null);
      }
    }
  }

  async function removeSelection() {
    if (!selection || chalkDraft || board.pending) return;
    if ((selection.kind === 'member' && !selectedMember) || (selection.kind === 'edge' && !selectedEdge)) return;
    const removed = selection.kind === 'member' ? await board.unmount(selection.id)
      : selection.kind === 'edge' ? await board.removeEdge(selection.id) : await board.removeVisual(selection.id);
    if (removed) setSelection(null);
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (openNoteIdRef.current) return;
    if ((event.target as HTMLElement).closest('input, select, textarea, button, a')) return;
    if (event.code === 'Space') { event.preventDefault(); spaceDown.current = true; }
    if (event.key === 'Escape') { setSelection(null); setConnectFrom(null); setLabelDraft(null); setTool('select'); }
    if (event.key === 'Enter' && selectedMember) {
      event.preventDefault();
      if (tool === 'connect') void connect(selectedMember);
      else void openMember(selectedMember);
    }
    if (event.key === 'Enter' && selectedVisual?.visual_kind === 'sticky') {
      event.preventDefault(); editChalk(selectedVisual);
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection) { event.preventDefault(); void removeSelection(); }
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
      event.preventDefault();
      if (openNoteIdRef.current) return;
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

  return <><section className={styles.workspace} aria-label="Board workspace" onPaste={pasteReference}
    onKeyDownCapture={pauseBoard} onKeyUpCapture={pauseBoard} onPasteCapture={pauseBoard}
    onPointerDownCapture={pauseBoard} onPointerMoveCapture={pauseBoard} onPointerUpCapture={pauseBoard}
    onClickCapture={pauseBoard} onContextMenuCapture={pauseBoard}
    onDoubleClickCapture={(event) => {
      // The visible board edge remains a note-switch target while all other board gestures yield.
      if (!(event.target as Element).closest('[data-board-note-switch="true"]')) pauseBoard(event);
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
      <button ref={pickerToggle} className={styles.primaryButton} aria-expanded={pickerOpen} aria-controls="board-note-picker"
        onClick={() => pickerOpen ? closePicker() : openPicker()}><Plus size={16} />Add notes and items</button>
      <button ref={stagingToggle} className={`${styles.button} ${styles.stagingToggle}`} data-board-staging-control="true"
        aria-expanded={stagingOpen} aria-controls="board-staging" onClick={() => stagingOpen ? closeStaging() : setStagingOpen(true)}>
        <Inbox size={16} />Staging ({stagedMembers.length})
      </button>
      <details className={styles.boardMenu}>
        <summary aria-label="Board menu">More</summary>
        <button className={styles.button} disabled={board.pending} onClick={() => { void prepareDelete(); }}>Delete board</button>
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
        { key: 'connect', label: 'Connect', Icon: Link2 }, { key: 'pen', label: 'Pen', Icon: Pencil }] as const).map(({ key, label, Icon }) =>
        <button key={key} className={styles.button} aria-pressed={tool === key}
          onClick={() => { setTool(key); setConnectFrom(null); }}><Icon size={16} />{label}</button>)}
      <span className={styles.toolHint}>{tool === 'connect' ? (connectFrom ? 'Choose the next card' : 'Choose two cards to connect')
        : tool === 'pen' ? 'Draw on the board' : 'Drag to arrange · Double-click blank space to write chalk'}</span>
      <div className={styles.zoomControls}>
        <button className={styles.button} aria-label="Zoom board out" onClick={() => zoom(1 / 1.2)}><Minus size={16} /></button>
        <button className={styles.button} aria-label="Reset board zoom" onClick={() => zoom(1 / activeViewport.zoom)}>{Math.round(activeViewport.zoom * 100)}%</button>
        <button className={styles.button} aria-label="Zoom board in" onClick={() => zoom(1.2)}><Plus size={16} /></button>
      </div>
    </div>
    <div className={styles.boardBody}>
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
                  z_index: nextMemberZ() });
              }}>
              <strong>{candidate.title}</strong><span>{candidate.summary || 'Open the note to read more.'}</span>
              <small>{candidate.member_kind === 'item' ? [candidate.item_type, candidate.topic].filter(Boolean).join(' · ') || 'Item'
                : candidate.member_kind === 'note' ? 'Note' : 'Group'} · {candidate.project_title}</small>
            </button><button type="button" className={styles.stageCandidate} disabled={board.pending}
              aria-label={`Stage ${candidate.title}`} onClick={() => { void stageCandidate(candidate); }}>Stage</button></li>)}</ul></section>;
          })}
      </aside>}
      <div className={`${styles.surface} ${tool === 'pen' ? styles.penSurface : ''}`} ref={surface}
        data-testid="board-surface" tabIndex={0} aria-label="Board canvas" onKeyDown={keyDown}
        onKeyUp={(event) => { if (event.code === 'Space') spaceDown.current = false; }}
        onBlur={() => { spaceDown.current = false; }}
        onDoubleClick={draftChalk}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(BOARD_STAGING_MIME) || board.pending || chalkDraft) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={dropStagedMember}
        onPointerDown={(event) => begin(event)} onPointerMove={move}
        onPointerUp={(event) => { void end(event); }} onPointerCancel={(event) => { void end(event, true); }}>
        <div className={styles.world} data-testid="board-world"
          style={{ transform: `translate(${activeViewport.x}px, ${activeViewport.y}px) scale(${activeViewport.zoom})` }}>
          <svg className={styles.connections} aria-label="Board connections and ink"
            style={labelDraft ? { zIndex: Math.max(0, ...visibleMembers.map((member) => member.z_index), ...visibleVisuals.map((visual) => visual.z_index)) + 1 } : undefined}>
            <defs><marker id="board-edge-arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" />
            </marker></defs>
            {visibleEdges.map((edge) => {
              const from = visibleMembers.find((member) => member.id === edge.from_member_id);
              const to = visibleMembers.find((member) => member.id === edge.to_member_id);
              if (!from || !to) return null;
              const start = connectionPoint(from, to);
              const finish = connectionPoint(to, from);
              const path = `M ${start.x} ${start.y} L ${finish.x} ${finish.y}`;
              return <g key={edge.id}>
                <path d={path} data-testid={`board-edge-${edge.id}`}
                  markerStart={edge.style.direction === 'both' ? 'url(#board-edge-arrow)' : undefined}
                  markerEnd={edge.style.direction === 'forward' || edge.style.direction === 'both' ? 'url(#board-edge-arrow)' : undefined}
                  className={selection?.id === edge.id ? styles.selectedLine : styles.edgeLine} />
                {tool === 'select' && <path d={path} className={styles.lineHit} role="button" tabIndex={0}
                  aria-label={`Connection ${from.reference.title || 'note'} to ${to.reference.title || 'note'}`}
                  onFocus={() => setSelection({ kind: 'edge', id: edge.id })}
                  onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'edge', id: edge.id }); }}
                  onDoubleClick={(event) => { event.stopPropagation(); editLabel(edge); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelection({ kind: 'edge', id: edge.id }); } }} />}
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
            {visibleVisuals.filter((visual) => visual.visual_kind === 'freehand').map((visual) => <g key={visual.id} data-testid={`board-visual-${visual.id}`}
              transform={`translate(${visual.x} ${visual.y}) rotate(${visual.rotation}) scale(${visual.scale})`}>
              <path d={strokePath(visual)} className={selection?.id === visual.id ? styles.selectedLine : styles.inkLine} />
              {tool === 'select' && <path d={strokePath(visual)} className={styles.lineHit} role="button" tabIndex={0}
                aria-label="Select drawing" onPointerDown={(event) => begin(event, visual)}
                onFocus={() => setSelection({ kind: 'visual', id: visual.id })}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelection({ kind: 'visual', id: visual.id }); } }} />}
            </g>)}
            {ink.length > 0 && <path d={pointsPath(ink)} className={styles.inkLine} />}
          </svg>
          {visibleVisuals.filter((visual) => visual.visual_kind !== 'freehand' && visual.visual_kind !== 'sticky').map((visual) =>
            <BoardRelocatedVisual key={visual.id} visual={visual} selected={selection?.id === visual.id}
              selectable={tool === 'select'} onSelect={() => setSelection({ kind: 'visual', id: visual.id })}
              onPointerDown={(event) => begin(event, visual)} onResize={(event) => begin(event, visual, true)} />)}
          {visibleVisuals.filter((visual) => visual.visual_kind === 'sticky' && visual.id !== chalkDraft?.id).map((visual) =>
            <div key={visual.id} className={`${styles.chalk} ${selection?.id === visual.id ? styles.selected : ''}`}
              style={chalkGeometry(visual)} data-testid={`board-visual-${visual.id}`} data-visual-kind="sticky"
              role={tool === 'select' ? 'button' : undefined} tabIndex={tool === 'select' ? 0 : undefined}
              aria-label="Select chalk" title={visual.pinned ? 'Pinned chalk · Double-click to edit' : 'Double-click to edit chalk'}
              onFocus={() => { if (tool === 'select') setSelection({ kind: 'visual', id: visual.id }); }}
              onPointerDown={(event) => begin(event, visual)}
              onDoubleClick={(event) => { event.stopPropagation(); editChalk(visual); }}>
              <p>{typeof visual.data.text === 'string' ? visual.data.text : ''}</p>
            </div>)}
          {chalkDraft && <BoardChalkEditor key={chalkDraft.id || 'new'} draft={chalkDraft}
            onSave={saveChalk} onCancel={() => setChalkDraft(null)} />}
          {visibleMembers.map((member) => {
            const candidate = candidateById.get(`${member.member_kind}:${member.member_id}`);
            const isItem = member.member_kind === 'item';
            const isTextRange = member.member_kind === 'text_range';
            const anchorStatus = member.reference.anchor_status || 'lost';
            const itemState = member.reference.state === 'missing' ? 'Missing'
              : member.reference.reason === 'item_retired' ? 'Retired' : 'Active';
            const title = member.reference.title || (isItem ? member.reference.item_type || 'Item' : candidate?.title)
              || (isTextRange ? 'Source note unavailable' : 'Unavailable projection');
            const canOpen = (isTextRange || member.reference.state === 'available') && Boolean(member.reference.note_id);
            const openHint = isItem && !member.reference.note_id
              ? 'This item has no origin note. Double-click is unavailable.' : undefined;
            return <article key={member.id} data-testid={`board-member-${member.id}`} tabIndex={0}
              data-board-note-switch={member.member_kind === 'note' && canOpen ? 'true' : undefined}
              aria-label={title}
              aria-disabled={!canOpen}
              title={openHint}
              className={`${styles.member} ${selection?.id === member.id || connectFrom === member.id ? styles.selected : ''}`}
              style={{ left: member.x, top: member.y, width: member.w, height: member.h,
                transform: `scale(${member.scale})`, zIndex: member.z_index }}
              onPointerDown={(event) => begin(event, member)}
              onFocus={() => setSelection({ kind: 'member', id: member.id })}
              onDoubleClick={canOpen ? (event) => {
                event.stopPropagation();
                if (tool !== 'select') return;
                if (member.member_kind === 'note') openNote(member);
                else void openMember(member);
              } : undefined}>
              <div className={styles.memberKind}>{{ note: 'Note', content_group: 'Group', item: 'Item', text_range: 'Text range' }[member.member_kind]}
                {isTextRange && <span className={styles.itemStatus} data-anchor-status={anchorStatus}>
                  {{ active: 'Live', drifted: 'Drifted', lost: 'Lost' }[anchorStatus]}</span>}
                {isItem && <span className={styles.itemStatus}>{itemState}</span>}{member.pinned && <Pin size={13} aria-label="Pinned" />}</div>
              <h2>{title}</h2>
              <p>{isTextRange ? member.reference.summary || 'Text snapshot unavailable.'
                : member.reference.state !== 'available' ? (member.reference.state === 'missing' ? 'This content is no longer available.' : 'This content is currently unavailable.')
                : isItem ? member.reference.summary || 'Item preview unavailable.'
                  : member.member_kind === 'note' && member.reference.note_id && notePreviews[member.reference.note_id] !== undefined
                    ? notePreviews[member.reference.note_id] || 'This note is empty.'
                  : candidate?.summary || (candidateError ? 'Preview unavailable. Open the note to read.' : 'Open the note to read more.')}</p>
              {isItem && member.reference.topic && <small className={styles.itemTopic}>{member.reference.topic}</small>}
              {isItem && member.reference.state !== 'missing' && <small>{itemOriginLabel({
                origin_note_id: member.reference.note_id,
                origin_board_id: member.reference.origin_board_id ?? null,
                origin_board_title: member.reference.origin_board_title ?? null,
              })}</small>}
              {isTextRange && <>
                {anchorStatus !== 'active' && <small className={styles.anchorNotice}>
                  {anchorStatus === 'drifted' ? 'Source changed' : 'Source lost'} · Last valid snapshot
                </small>}
                <button type="button" className={styles.sourceLink} disabled={!canOpen}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onClick={(event) => { event.stopPropagation(); void openMember(member); }}>
                  <ExternalLink size={12} />Open source note
                </button>
              </>}
              {!member.reference.note_id && <small>No linked note to open</small>}
              {!member.pinned && tool === 'select' && <button className={styles.resizeHandle} aria-label={`Resize ${member.reference.title || 'projection'}`}
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => begin(event, member, true)} />}
            </article>;
          })}
        </div>
        {visibleMembers.length === 0 && detail.visuals.length === 0 && !chalkDraft && <div className={styles.canvasEmpty}>
          <h2>Give this thought some room.</h2><p>Double-click blank space to write chalk, add a note, or pick up the pen.</p>
          <button className={styles.button} onPointerDown={(event) => event.stopPropagation()} onClick={openPicker}>Add your first note or item</button>
        </div>}
      </div>
      {stagingOpen && <BoardStaging boardId={detail.board.id} members={stagedMembers} candidates={candidates}
        busy={board.pending || Boolean(chalkDraft)} onClose={closeStaging}
        onPlace={(member) => { void placeMember(member); }}
        onRemove={(member) => { void board.unmount(member.id); }} />}
    </div>
    {selection && (selectedMember || selectedEdge || selectedVisual) && <div className={styles.selectionBar} role="toolbar" aria-label="Selected projection controls">
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
      <button className={styles.button} disabled={board.pending || Boolean(chalkDraft)} onClick={() => { void removeSelection(); }}><Trash2 size={15} />{selection.kind === 'member' ? 'Remove from board' : selection.kind === 'edge' ? 'Delete connection' : selectedVisual?.visual_kind === 'sticky' ? 'Delete chalk' : 'Delete drawing'}</button>
    </div>}
    {deleting && <BoardDeleteDialog board={detail.board} onCancel={() => setDeleting(false)} onDeleted={() => navigate('/boards')} />}
  </section>
    {openNoteId && <BoardNoteModal key={openNoteId} ref={noteModal} noteId={openNoteId}
      stagingOpen={stagingOpen} onSendToStaging={stageTextRange}
      onClosed={() => { setOpenNoteId(null); refreshProjections(openNoteId); }}
      onSwitchNote={(noteId) => { setOpenNoteId(noteId); refreshProjections(openNoteId); }}
      onOpenFullPage={(noteId) => { setOpenNoteId(null); void leave(`/notes/${encodeURIComponent(noteId)}`); }} />}
  </>;
}
