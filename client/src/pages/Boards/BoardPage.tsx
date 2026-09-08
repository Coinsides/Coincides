import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hand, Link2, MousePointer2, Pencil, Plus, Minus, Pin, Trash2, ExternalLink } from 'lucide-react';
import { boardErrorMessage, loadBoardCandidates } from './boardRepository';
import type { BoardCandidate, BoardMember, BoardViewport, BoardVisual } from './boardTypes';
import { pointsPath, toBoardPoint, zoomBoardAt, type BoardPoint } from './boardViewport';
import { useBoard } from './useBoard';
import { BoardRelocatedVisual } from './BoardRelocatedVisual';
import styles from './Boards.module.css';

type Tool = 'select' | 'pan' | 'connect' | 'pen';
type Selection = { kind: 'member' | 'edge' | 'visual'; id: string } | null;
type Gesture =
  | { kind: 'pan'; start: BoardPoint; viewport: BoardViewport }
  | { kind: 'move' | 'resize'; start: BoardPoint; member: BoardMember }
  | { kind: 'pen'; points: BoardPoint[] };

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
  const [tool, setTool] = useState<Tool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<BoardCandidate[]>([]);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewport, setViewport] = useState<BoardViewport | null>(null);
  const [viewportDirty, setViewportDirty] = useState(false);
  const [memberDraft, setMemberDraft] = useState<BoardMember | null>(null);
  const [ink, setInk] = useState<BoardPoint[]>([]);
  const surface = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const capturedPointer = useRef<Element | null>(null);
  const gestureRevision = useRef(0);
  const visitRevision = useRef(0);
  const routeId = useRef(boardId);
  routeId.current = boardId;
  const memberDraftRef = useRef<BoardMember | null>(null);
  const viewportRef = useRef<BoardViewport | null>(null);
  const viewportTimer = useRef<ReturnType<typeof setTimeout>>();
  const viewportPending = useRef<BoardViewport | null>(null);
  const saveViewport = useRef(board.updateBoard);
  saveViewport.current = board.updateBoard;
  const spaceDown = useRef(false);
  const detail = board.detail;

  const loadCandidates = useCallback(async () => {
    setCandidateLoading(true);
    setCandidateError(null);
    try { setCandidates(await loadBoardCandidates()); }
    catch (cause) { setCandidateError(boardErrorMessage(cause)); }
    finally { setCandidateLoading(false); }
  }, []);
  useEffect(() => { void loadCandidates(); }, [loadCandidates]);
  useEffect(() => {
    visitRevision.current += 1;
    setViewport(null);
    setViewportDirty(false);
    viewportRef.current = null;
    setSelection(null);
    setConnectFrom(null);
    gesture.current = null;
    setMemberDraft(null);
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
    if (member.reference.state !== 'available' || !member.reference.note_id) return;
    await leave(`/notes/${encodeURIComponent(member.reference.note_id)}`);
  }

  function localPoint(event: { clientX: number; clientY: number }): BoardPoint {
    const rect = surface.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const visibleMembers = (detail?.members || []).map((member) => memberDraft?.id === member.id ? memberDraft : member);
  const selectedMember = selection?.kind === 'member' ? visibleMembers.find(({ id }) => id === selection.id) : undefined;

  async function connect(member: BoardMember) {
    if (board.pending) return;
    if (!connectFrom) { setConnectFrom(member.id); return; }
    if (connectFrom === member.id) { setConnectFrom(null); return; }
    if (await board.addEdge({ from_member_id: connectFrom, to_member_id: member.id })) setConnectFrom(null);
  }

  function begin(event: React.PointerEvent, member?: BoardMember, resize = false) {
    if (event.button !== 0 && event.button !== 1) return;
    if (!detail || !viewportRef.current) return;
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
    } else if (member) {
      setSelection({ kind: 'member', id: member.id });
      if (tool === 'connect') { void connect(member); return; }
      if (member.pinned) return;
      gesture.current = { kind: resize ? 'resize' : 'move', start, member };
      memberDraftRef.current = member;
      setMemberDraft(member);
    } else {
      setSelection(null);
      setConnectFrom(null);
      gesture.current = { kind: 'pan', start, viewport: current };
    }
    // Keep clicks/double-clicks targeted at the member while drag events bubble to the surface.
    capturedPointer.current = member ? event.currentTarget : surface.current;
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
      const member = current.kind === 'move'
        ? { ...current.member, x: current.member.x + dx, y: current.member.y + dy }
        : { ...current.member, w: Math.max(160, current.member.w + dx / current.member.scale),
          h: Math.max(100, current.member.h + dy / current.member.scale) };
      memberDraftRef.current = member;
      setMemberDraft(member);
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
      const next = memberDraftRef.current;
      if (!cancel && next && (next.x !== current.member.x || next.y !== current.member.y || next.w !== current.member.w || next.h !== current.member.h)) {
        await board.updateMember(next.id, { x: next.x, y: next.y, w: next.w, h: next.h });
      }
      if (revision === gestureRevision.current) {
        memberDraftRef.current = null;
        setMemberDraft(null);
      }
    }
  }

  async function removeSelection() {
    if (!selection) return;
    const removed = selection.kind === 'member' ? await board.unmount(selection.id)
      : selection.kind === 'edge' ? await board.removeEdge(selection.id) : await board.removeVisual(selection.id);
    if (removed) setSelection(null);
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('input, select, textarea, button, a')) return;
    if (event.code === 'Space') { event.preventDefault(); spaceDown.current = true; }
    if (event.key === 'Escape') { setSelection(null); setConnectFrom(null); setTool('select'); }
    if (event.key === 'Enter' && selectedMember) {
      event.preventDefault();
      if (tool === 'connect') void connect(selectedMember);
      else void openMember(selectedMember);
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
  const matching = candidates.filter((candidate) => `${candidate.title} ${candidate.summary} ${candidate.project_title}`
    .toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const candidateById = new Map(candidates.map((candidate) => [`${candidate.member_kind}:${candidate.member_id}`, candidate]));
  function zoom(factor: number) {
    changeViewport(zoomBoardAt(viewportRef.current || activeViewport, {
      x: (surface.current?.clientWidth || 800) / 2, y: (surface.current?.clientHeight || 600) / 2,
    }, factor));
  }

  return <section className={styles.workspace} aria-label="Board workspace">
    <header className={styles.boardHeader}>
      <button className={styles.button} onClick={() => { void leave('/boards'); }}><ArrowLeft size={16} />Boards</button>
      <h1 title={detail.board.title}>{detail.board.title}</h1>
      <span className={styles.saveStatus} role="status">{board.error ? 'Changes need attention' : board.pending || viewportDirty ? 'Saving…' : 'Saved'}</span>
      <button className={styles.primaryButton} aria-expanded={pickerOpen} onClick={() => setPickerOpen(!pickerOpen)}><Plus size={16} />Add notes</button>
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
        : tool === 'pen' ? 'Draw on the board' : 'Drag to arrange · Double-click to open a note'}</span>
      <div className={styles.zoomControls}>
        <button className={styles.button} aria-label="Zoom board out" onClick={() => zoom(1 / 1.2)}><Minus size={16} /></button>
        <button className={styles.button} aria-label="Reset board zoom" onClick={() => zoom(1 / activeViewport.zoom)}>{Math.round(activeViewport.zoom * 100)}%</button>
        <button className={styles.button} aria-label="Zoom board in" onClick={() => zoom(1.2)}><Plus size={16} /></button>
      </div>
    </div>
    <div className={styles.boardBody}>
      {pickerOpen && <aside className={styles.picker} aria-label="Add projections">
        <label htmlFor="board-candidate-search">Notes and groups</label>
        <input id="board-candidate-search" type="search" value={search} placeholder="Search your library"
          onChange={(event) => setSearch(event.currentTarget.value)} />
        {candidateLoading ? <p role="status">Loading notes…</p> : candidateError ? <div role="alert"><p>{candidateError}</p>
          <button className={styles.button} onClick={() => { void loadCandidates(); }}>Retry notes</button></div>
          : matching.length === 0 ? <p>No matching notes or groups.</p> : <ul>{matching.map((candidate) =>
            <li key={`${candidate.member_kind}:${candidate.member_id}`}><button className={styles.candidate}
              disabled={board.pending} aria-label={`Add ${candidate.title} to board`}
              onClick={() => {
                const position = toBoardPoint({ x: 80 + (detail.members.length % 3) * 300,
                  y: 70 + Math.floor(detail.members.length / 3) * 200 }, viewportRef.current || activeViewport);
                void board.mount({ id: crypto.randomUUID(), member_kind: candidate.member_kind, member_id: candidate.member_id,
                  x: position.x, y: position.y, w: 260, h: 156, scale: 1,
                  z_index: Math.max(0, ...detail.members.map((member) => member.z_index)) + 1 });
              }}>
              <strong>{candidate.title}</strong><span>{candidate.summary || 'Open the note to read more.'}</span>
              <small>{candidate.member_kind === 'note' ? 'Note' : 'Group'} · {candidate.project_title}</small>
            </button></li>)}</ul>}
      </aside>}
      <div className={`${styles.surface} ${tool === 'pen' ? styles.penSurface : ''}`} ref={surface}
        data-testid="board-surface" tabIndex={0} aria-label="Board canvas" onKeyDown={keyDown}
        onKeyUp={(event) => { if (event.code === 'Space') spaceDown.current = false; }}
        onBlur={() => { spaceDown.current = false; }}
        onPointerDown={(event) => begin(event)} onPointerMove={move}
        onPointerUp={(event) => { void end(event); }} onPointerCancel={(event) => { void end(event, true); }}>
        <div className={styles.world} data-testid="board-world"
          style={{ transform: `translate(${activeViewport.x}px, ${activeViewport.y}px) scale(${activeViewport.zoom})` }}>
          <svg className={styles.connections} aria-label="Board connections and ink">
            {detail.edges.map((edge) => {
              const from = visibleMembers.find((member) => member.id === edge.from_member_id);
              const to = visibleMembers.find((member) => member.id === edge.to_member_id);
              if (!from || !to) return null;
              const start = { x: from.x + from.w * from.scale / 2, y: from.y + from.h * from.scale / 2 };
              const finish = { x: to.x + to.w * to.scale / 2, y: to.y + to.h * to.scale / 2 };
              const path = `M ${start.x} ${start.y} L ${finish.x} ${finish.y}`;
              return <g key={edge.id}>
                <path d={path} className={selection?.id === edge.id ? styles.selectedLine : styles.edgeLine} />
                {tool === 'select' && <path d={path} className={styles.lineHit} role="button" tabIndex={0}
                  aria-label={`Connection ${from.reference.title || 'note'} to ${to.reference.title || 'note'}`}
                  onFocus={() => setSelection({ kind: 'edge', id: edge.id })}
                  onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'edge', id: edge.id }); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelection({ kind: 'edge', id: edge.id }); } }} />}
                {edge.label && <text x={(start.x + finish.x) / 2} y={(start.y + finish.y) / 2 - 8} className={styles.edgeLabel}>{edge.label}</text>}
              </g>;
            })}
            {detail.visuals.filter((visual) => visual.visual_kind === 'freehand').map((visual) => <g key={visual.id}
              transform={`translate(${visual.x} ${visual.y}) rotate(${visual.rotation}) scale(${visual.scale})`}>
              <path d={strokePath(visual)} className={selection?.id === visual.id ? styles.selectedLine : styles.inkLine} />
              {tool === 'select' && <path d={strokePath(visual)} className={styles.lineHit} role="button" tabIndex={0}
                aria-label="Select drawing" onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'visual', id: visual.id }); }}
                onFocus={() => setSelection({ kind: 'visual', id: visual.id })}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setSelection({ kind: 'visual', id: visual.id }); } }} />}
            </g>)}
            {ink.length > 0 && <path d={pointsPath(ink)} className={styles.inkLine} />}
          </svg>
          {detail.visuals.filter((visual) => visual.visual_kind !== 'freehand').map((visual) =>
            <BoardRelocatedVisual key={visual.id} visual={visual} selected={selection?.id === visual.id}
              selectable={tool === 'select'} onSelect={() => setSelection({ kind: 'visual', id: visual.id })} />)}
          {visibleMembers.map((member) => {
            const candidate = candidateById.get(`${member.member_kind}:${member.member_id}`);
            return <article key={member.id} data-testid={`board-member-${member.id}`} tabIndex={0}
              aria-label={member.reference.title || 'Unavailable projection'}
              aria-disabled={member.reference.state !== 'available'}
              className={`${styles.member} ${selection?.id === member.id || connectFrom === member.id ? styles.selected : ''}`}
              style={{ left: member.x, top: member.y, width: member.w, height: member.h,
                transform: `scale(${member.scale})`, zIndex: member.z_index }}
              onPointerDown={(event) => begin(event, member)}
              onFocus={() => setSelection({ kind: 'member', id: member.id })}
              onDoubleClick={(event) => { event.stopPropagation(); if (tool === 'select') void openMember(member); }}>
              <div className={styles.memberKind}>{{ note: 'Note', content_group: 'Group', item: 'Item', text_range: 'Text range' }[member.member_kind]}{member.pinned && <Pin size={13} aria-label="Pinned" />}</div>
              <h2>{member.reference.title || candidate?.title || 'Unavailable projection'}</h2>
              <p>{member.reference.state !== 'available' ? (member.reference.state === 'missing' ? 'This content is no longer available.' : 'This content is currently unavailable.')
                : candidate?.summary || (candidateError ? 'Preview unavailable. Open the note to read.' : 'Open the note to read more.')}</p>
              {!member.reference.note_id && <small>No linked note to open</small>}
              {!member.pinned && tool === 'select' && <button className={styles.resizeHandle} aria-label={`Resize ${member.reference.title || 'projection'}`}
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => begin(event, member, true)} />}
            </article>;
          })}
        </div>
        {detail.members.length === 0 && detail.visuals.length === 0 && <div className={styles.canvasEmpty}>
          <h2>Give this thought some room.</h2><p>Add a few notes, draw a connection, or pick up the pen.</p>
          <button className={styles.button} onPointerDown={(event) => event.stopPropagation()} onClick={() => setPickerOpen(true)}>Add your first note</button>
        </div>}
      </div>
    </div>
    {selection && <div className={styles.selectionBar} role="toolbar" aria-label="Selected projection controls">
      {selectedMember && <>
        <button className={styles.button} disabled={!selectedMember.reference.note_id || selectedMember.reference.state !== 'available'} onClick={() => { void openMember(selectedMember); }}><ExternalLink size={15} />Open note</button>
        <button className={styles.button} disabled={board.pending} aria-pressed={selectedMember.pinned} onClick={() => { void board.updateMember(selectedMember.id, { pinned: !selectedMember.pinned }); }}><Pin size={15} />{selectedMember.pinned ? 'Unpin' : 'Pin'}</button>
        <button className={styles.button} aria-label="Shrink projection" disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { scale: Math.max(0.1, selectedMember.scale / 1.1) }); }}><Minus size={15} /></button>
        <span>{Math.round(selectedMember.scale * 100)}%</span>
        <button className={styles.button} aria-label="Enlarge projection" disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { scale: Math.min(10, selectedMember.scale * 1.1) }); }}><Plus size={15} /></button>
        <button className={styles.button} disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { z_index: Math.max(...detail.members.map((member) => member.z_index)) + 1 }); }}>Bring forward</button>
        <button className={styles.button} disabled={selectedMember.pinned || board.pending} onClick={() => { void board.updateMember(selectedMember.id, { z_index: Math.min(...detail.members.map((member) => member.z_index)) - 1 }); }}>Send back</button>
      </>}
      <button className={styles.button} disabled={board.pending} onClick={() => { void removeSelection(); }}><Trash2 size={15} />{selection.kind === 'member' ? 'Remove from board' : selection.kind === 'edge' ? 'Delete connection' : 'Delete drawing'}</button>
    </div>}
  </section>;
}
