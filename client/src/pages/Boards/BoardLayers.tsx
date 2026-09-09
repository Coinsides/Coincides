import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { BOARD_LAYER_LIMIT, type BoardLayer, type BoardMember, type BoardVisual, type PatchBoardLayerInput } from './boardTypes';
import styles from './BoardLayers.module.css';

interface BoardLayersProps {
  layers: BoardLayer[];
  members: BoardMember[];
  visuals: BoardVisual[];
  activeLayerId: string | null;
  baseVisible: boolean;
  pending: boolean;
  onSelectLayer: (layerId: string | null) => void;
  onBaseVisibleChange: (visible: boolean) => void | Promise<unknown>;
  onCreateLayer: (name: string) => void | Promise<unknown>;
  onUpdateLayer: (layerId: string, input: PatchBoardLayerInput) => void | Promise<boolean>;
  /** Custom layer ids, from lowest to highest. */
  onReorderLayers: (layerIds: string[]) => void | Promise<unknown>;
  onDeleteLayer: (layerId: string) => void | Promise<boolean>;
  onClose: () => void;
}

export function BoardLayers({
  layers, members, visuals, activeLayerId, baseVisible, pending, onSelectLayer,
  onBaseVisibleChange, onCreateLayer, onUpdateLayer, onReorderLayers, onDeleteLayer, onClose,
}: BoardLayersProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const renameSaving = useRef(false);
  const ordered = [...layers].sort((a, b) => b.order_index - a.order_index);
  const deletingLayer = layers.find((layer) => layer.id === deletingId);
  const objectCount = (layerId: string | null) => [...members, ...visuals]
    .filter((object) => (object.layer_id ?? null) === layerId).length;

  useEffect(() => {
    if (deletingLayer) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [deletingLayer]);

  const rename = async () => {
    const layer = layers.find((candidate) => candidate.id === renamingId);
    if (!layer || renameSaving.current) return;
    const name = draftName.trim();
    if (!name || name === layer.name) { setRenamingId(null); return; }
    renameSaving.current = true;
    try {
      if (await onUpdateLayer(layer.id, { name }) !== false) setRenamingId(null);
    } finally { renameSaving.current = false; }
  };
  const moveLayer = (layerId: string, targetIndex: number) => {
    const ids = ordered.map((layer) => layer.id);
    const from = ids.indexOf(layerId);
    if (pending || from < 0 || targetIndex < 0 || targetIndex >= ids.length || from === targetIndex) return;
    ids.splice(from, 1);
    ids.splice(targetIndex, 0, layerId);
    void onReorderLayers(ids.reverse());
  };
  const startRename = (layer: BoardLayer) => {
    if (pending) return;
    setDraftName(layer.name);
    setRenamingId(layer.id);
  };

  return <aside id="board-layers" className={styles.panel} aria-label="Layers"
    onPointerDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && !deletingId && !renamingId) onClose();
    }}>
    <header className={styles.header}>
      <h2>Layers <span>{layers.length + 1}/{BOARD_LAYER_LIMIT}</span></h2>
      <button type="button" aria-label="Close layers" onClick={onClose}><X size={16} /></button>
    </header>
    <p className={styles.hint}>Highest layer first. Select a layer for new objects.</p>
    <ul className={styles.list}>
      {ordered.map((layer, index) => <li key={layer.id} className={styles.row}
        data-layer-id={layer.id} data-active={activeLayerId === layer.id} draggable={!pending && renamingId !== layer.id}
        onDragStart={(event) => {
          if (pending || renamingId === layer.id) { event.preventDefault(); return; }
          event.stopPropagation();
          setDraggingId(layer.id);
          event.dataTransfer.setData('application/x-board-layer', layer.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDraggingId(null)}
        onDragOver={(event) => {
          if (!pending && draggingId) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; }
        }}
        onDrop={(event) => {
          if (!draggingId) return;
          event.preventDefault(); event.stopPropagation();
          moveLayer(draggingId, index);
          setDraggingId(null);
        }}>
        <button type="button" className={styles.grip} aria-label={`Move ${layer.name}`}
          title="Drag to reorder, or use the up and down arrow keys" disabled={pending}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              moveLayer(layer.id, index + (event.key === 'ArrowUp' ? -1 : 1));
            }
          }}><GripVertical size={14} /></button>
        {renamingId === layer.id ? <input className={styles.nameInput} aria-label="Layer name" autoFocus
          maxLength={80} value={draftName} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => { void rename(); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); void rename(); }
            if (event.key === 'Escape') { event.preventDefault(); setRenamingId(null); }
          }} />
          : <button type="button" className={styles.name} aria-label={layer.name} aria-pressed={activeLayerId === layer.id}
            title="Double-click or press F2 to rename" onClick={() => onSelectLayer(layer.id)}
            onDoubleClick={() => startRename(layer)}
            onKeyDown={(event) => { if (event.key === 'F2') { event.preventDefault(); startRename(layer); } }}>
            <span>{layer.name}</span><small>{objectCount(layer.id)}</small>
          </button>}
        <button type="button" aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} disabled={pending}
          onClick={() => { void onUpdateLayer(layer.id, { visible: !layer.visible }); }}>
          {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button type="button" aria-label={`Delete ${layer.name}`} disabled={pending}
          onClick={() => setDeletingId(layer.id)}><Trash2 size={14} /></button>
      </li>)}
      <li className={`${styles.row} ${styles.base}`} data-layer-id="base" data-active={activeLayerId === null}>
        <span className={styles.gripPlaceholder} aria-hidden="true" />
        <button type="button" className={styles.name} aria-label="Base" aria-pressed={activeLayerId === null} onClick={() => onSelectLayer(null)}>
          <span>Base</span><small>{objectCount(null)}</small>
        </button>
        <button type="button" aria-label={`${baseVisible ? 'Hide' : 'Show'} Base`} disabled={pending}
          onClick={() => { void onBaseVisibleChange(!baseVisible); }}>
          {baseVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <span className={styles.gripPlaceholder} aria-hidden="true" />
      </li>
    </ul>
    <button type="button" className={styles.add} disabled={pending || layers.length + 1 >= BOARD_LAYER_LIMIT}
      onClick={() => {
        let number = layers.length + 1;
        while (layers.some((layer) => layer.name === `Layer ${number}`)) number++;
        void onCreateLayer(`Layer ${number}`);
      }}><Plus size={15} />Add layer</button>
    {layers.length + 1 >= BOARD_LAYER_LIMIT && <p className={styles.hint}>All 12 layers are in use.</p>}
    <dialog ref={dialogRef} className={styles.dialog} aria-label={`Delete layer ${deletingLayer?.name ?? ''}`}
      onCancel={() => setDeletingId(null)} onClose={() => setDeletingId(null)}>
      {deletingLayer && <>
        <h2>Delete “{deletingLayer.name}”?</h2>
        <p>{objectCount(deletingLayer.id)} objects will move to Base. Their positions will stay the same.</p>
        <div className={styles.dialogActions}>
          <button type="button" autoFocus disabled={pending} onClick={() => setDeletingId(null)}>Cancel</button>
          <button type="button" disabled={pending} onClick={async () => {
            if (await onDeleteLayer(deletingLayer.id) !== false) setDeletingId(null);
          }}>Delete layer</button>
        </div>
      </>}
    </dialog>
  </aside>;
}
