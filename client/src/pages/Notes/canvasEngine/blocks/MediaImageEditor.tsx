import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area, type MediaSize, type Size } from 'react-easy-crop';
import type { MediaImageEditV1, MediaImageRotation } from '@shared/types';
import {
  clampCoverPosition, clampCoverZoom, NOTE_COVER_MAX_ZOOM, NOTE_COVER_MIN_ZOOM,
} from '../../../Courses/noteCover/geometry';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import { readMediaBlockMetadata } from '../mediaBlockService';
import { mediaImageCrop, rotateMediaCrop, rotatedMediaSize } from '../mediaImageEdit';
import type { NoteBlock } from '../runtimeDataTypes';
import styles from './MediaImageEditor.module.css';

export interface MediaImageEditorProps {
  block: NoteBlock;
  aspectRatio?: number;
  onSave: (edit: MediaImageEditV1 | null) => Promise<boolean>;
  onCancel: () => void;
}

/** One mounted session; the caller closes after a successful metadata save. */
export function MediaImageEditor({ block, aspectRatio = 1, onSave, onCancel }: MediaImageEditorProps) {
  const metadata = readMediaBlockMetadata(block);
  const assetId = metadata?.asset_id ?? '';
  const initial = useRef(metadata?.edit_v1 ?? null);
  const draft = useRef<MediaImageEditV1 | null>(initial.current);
  const changed = useRef(false);
  const cropChanged = useRef(false);
  const ready = useRef(false);
  const latestCrop = useRef<Area | null>(null);
  const media = useRef<MediaSize | null>(null);
  const viewport = useRef<Size | null>(null);
  const saving = useRef(false);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  const instructionsId = useId();
  const zoomId = useId();
  const [asset, setAsset] = useState<{ url?: string; failed?: boolean }>({});
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(initial.current?.zoom ?? 1);
  const [rotation, setRotation] = useState<MediaImageRotation>(initial.current?.rotation ?? 0);
  const [seed, setSeed] = useState({ edit: initial.current, revision: 0 });
  const callbacks = useRef({ onCancel });
  callbacks.current = { onCancel };
  const natural = { width: metadata?.naturalWidth ?? aspectRatio, height: metadata?.naturalHeight ?? 1 };
  const seededCrop = mediaImageCrop(seed.edit, natural);
  const rotated = rotatedMediaSize(natural, rotation);
  // Preserve the saved window's shape. Quarter turns turn that window too;
  // merely opening, rotating, or resetting never implicitly crops to the block.
  const frameRatio = rotated.width * seededCrop.w / (rotated.height * seededCrop.h);
  const initialArea = { x: seededCrop.x, y: seededCrop.y, width: seededCrop.w, height: seededCrop.h };

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    if (!assetId) { setAsset({ failed: true }); return; }
    void loadCanvasImageAssetBlobUrl(assetId).then((url) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      currentUrl = url;
      setAsset({ url });
    }).catch(() => { if (active) setAsset({ failed: true }); });
    return () => { active = false; if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [assetId]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // The modal has its own unsaved draft. Never send undo/redo to the
      // notebook history while focus is on its buttons or crop viewport.
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!saving.current) callbacks.current.onCancel();
      }
      if (event.key !== 'Tab') return;
      const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
      ) ?? []);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement as HTMLElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const markCropChanged = () => {
    if (!ready.current || saving.current) return;
    changed.current = true;
    cropChanged.current = true;
    setError(null);
  };
  const currentEdit = (): MediaImageEditV1 | null => {
    if (!changed.current) return initial.current;
    if (!cropChanged.current || !latestCrop.current) return draft.current;
    const area = latestCrop.current;
    return { crop: { x: area.x, y: area.y, w: area.width, h: area.height }, zoom, rotation };
  };
  const reseed = (next: MediaImageEditV1 | null) => {
    draft.current = next;
    changed.current = true;
    cropChanged.current = false;
    ready.current = false;
    latestCrop.current = null;
    setLoaded(false);
    setCrop({ x: 0, y: 0 });
    setZoom(next?.zoom ?? 1);
    setRotation(next?.rotation ?? 0);
    setSeed((previous) => ({ edit: next, revision: previous.revision + 1 }));
    setError(null);
  };
  const rotate = () => {
    if (!ready.current || saving.current) return;
    const current = currentEdit();
    const nextRotation = ((rotation + 90) % 360) as MediaImageRotation;
    const next = {
      crop: current?.crop ? rotateMediaCrop(current.crop) : null,
      zoom: current?.zoom ?? null,
      rotation: nextRotation,
    };
    reseed(next.rotation === 0 && next.crop === null && next.zoom === null ? null : next);
  };
  const slideZoom = (next: number) => {
    markCropChanged();
    const bounded = clampCoverZoom(next);
    if (media.current && viewport.current) {
      setCrop(clampCoverPosition(crop, rotatedMediaSize(media.current, rotation), viewport.current, bounded));
    }
    setZoom(bounded);
  };
  const save = async () => {
    if (!loaded || loadFailed || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!await onSave(currentEdit())) setError('Could not save image changes. Your edits are kept; try Save again.');
    } catch {
      setError('Could not save image changes. Your edits are kept; try Save again.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const failed = asset.failed || loadFailed;

  return createPortal(
    <div className={styles.overlay}>
      <section ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={instructionsId} aria-busy={busy} tabIndex={-1}
        onKeyDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <h2 id={titleId}>Edit image</h2>
          <p id={instructionsId}>Drag to position. Scroll, pinch, or use Zoom to crop. The original image is kept.</p>
        </header>
        <div className={styles.editorBody}>
          <div className={styles.viewport} style={{ aspectRatio: frameRatio, '--image-frame-ratio': frameRatio } as CSSProperties}>
            {asset.url && !failed && <Cropper key={seed.revision} image={asset.url} crop={crop} zoom={zoom}
              rotation={rotation} aspect={frameRatio} objectFit="contain" restrictPosition
              minZoom={NOTE_COVER_MIN_ZOOM} maxZoom={NOTE_COVER_MAX_ZOOM}
              initialCroppedAreaPercentages={initialArea}
              onCropChange={(next) => { if (!saving.current) setCrop(next); }}
              onZoomChange={(next) => {
                if (saving.current) return;
                if (ready.current && Math.abs(next - zoom) > 1e-10) markCropChanged();
                setZoom(clampCoverZoom(next));
              }}
              onCropComplete={(area) => { latestCrop.current = area; }}
              onCropAreaChange={(area) => { latestCrop.current = area; }}
              setMediaSize={(size) => { media.current = size; }}
              onCropSizeChange={(size) => { viewport.current = size; }}
              onMediaLoaded={(size) => {
                media.current = size;
                if (size.naturalWidth <= 0 || size.naturalHeight <= 0) return;
                latestCrop.current ??= initialArea;
                ready.current = true;
                setLoaded(true);
              }}
              onInteractionStart={markCropChanged}
              onWheelRequest={() => { if (!ready.current || saving.current) return false; markCropChanged(); return true; }}
              onTouchRequest={() => ready.current && !saving.current}
              zoomWithScroll={!busy} showGrid={!busy}
              cropperProps={{ 'aria-label': 'Image crop area', 'aria-disabled': busy || !loaded, tabIndex: busy ? -1 : 0 }}
              mediaProps={{ alt: '', onError: () => { ready.current = false; setLoadFailed(true); setLoaded(false); } }}
              style={{ containerStyle: { pointerEvents: busy ? 'none' : undefined } }} />}
            {(!loaded || failed) && <div className={styles.status} role={failed ? 'alert' : 'status'}>
              {failed ? 'Could not load the image. Cancel and reopen to retry.' : 'Loading image…'}
            </div>}
          </div>
          <div className={styles.zoomControl}>
            <label htmlFor={zoomId}>Zoom</label>
            <input id={zoomId} type="range" min={NOTE_COVER_MIN_ZOOM} max={NOTE_COVER_MAX_ZOOM} step="0.01"
              value={zoom} disabled={busy || !loaded} onChange={(event) => slideZoom(Number(event.currentTarget.value))}
              aria-valuetext={`${Math.round(zoom * 100)}%`} />
            <output htmlFor={zoomId}>{Math.round(zoom * 100)}%</output>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={rotate} disabled={busy || !loaded}>Rotate 90°</button>
            <span aria-live="polite">{rotation}°</span>
            <button type="button" onClick={() => reseed(null)} disabled={busy || !loaded}>Reset</button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={styles.saveButton} onClick={() => { void save(); }} disabled={busy || !loaded || !!failed}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </section>
    </div>, document.body,
  );
}
