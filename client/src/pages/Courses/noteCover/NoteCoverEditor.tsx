import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area, type MediaSize, type Size } from 'react-easy-crop';
import { NOTE_CARD_COVER_ASPECT_RATIO, type NoteCoverFrame } from '@shared/types';
import {
  centeredCoverCrop, clampCoverPosition, clampCoverZoom,
  NOTE_COVER_MAX_ZOOM, NOTE_COVER_MIN_ZOOM,
} from './geometry';
import styles from './NoteCoverEditor.module.css';

export interface NoteCoverEditorProps {
  imageUrl: string;
  initialFrame?: NoteCoverFrame;
  busy?: boolean;
  error?: string | null;
  onSave: (frame: NoteCoverFrame) => void;
  onCancel: () => void;
}

/** This component owns one image editing session; the caller remounts on replacement. */
export function NoteCoverEditor({
  imageUrl, initialFrame, busy = false, error, onSave, onCancel,
}: NoteCoverEditorProps) {
  const titleId = useId();
  const instructionsId = useId();
  const zoomId = useId();
  const dialog = useRef<HTMLElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialFrame?.zoom ?? NOTE_COVER_MIN_ZOOM);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const media = useRef<MediaSize | null>(null);
  const viewport = useRef<Size | null>(null);
  const ready = useRef(false);
  const changed = useRef(false);
  const latestCrop = useRef<Area | null>(null);
  const maximumZoom = Math.max(NOTE_COVER_MAX_ZOOM, initialFrame?.zoom ?? NOTE_COVER_MIN_ZOOM);
  const callbacks = useRef({ onCancel, busy });
  callbacks.current = { onCancel, busy };

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!callbacks.current.busy) callbacks.current.onCancel();
      }
      if (event.key !== 'Tab') return;
      const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
      ) ?? []);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const rememberCrop = (area: Area) => { latestCrop.current = area; };
  const mediaLoaded = (size: MediaSize) => {
    media.current = size;
    if (size.naturalWidth <= 0 || size.naturalHeight <= 0) return;
    latestCrop.current ??= initialFrame?.crop ?? centeredCoverCrop({ width: size.naturalWidth, height: size.naturalHeight });
    ready.current = true;
    setLoaded(true);
    setLoadFailed(false);
  };
  const zoomChanged = (next: number) => {
    if (busy) return;
    // Library initialization runs before onMediaLoaded. Safari gesture events do
    // not emit onInteractionStart, so their controlled zoom change also counts.
    if (ready.current && Math.abs(next - zoom) > 1e-10) changed.current = true;
    setZoom(clampCoverZoom(next, maximumZoom));
  };
  const slideZoom = (next: number) => {
    changed.current = true;
    const bounded = clampCoverZoom(next, maximumZoom);
    if (media.current && viewport.current) {
      setCrop(clampCoverPosition(crop, media.current, viewport.current, bounded));
    }
    setZoom(bounded);
  };
  const save = () => {
    if (!loaded || loadFailed || busy || !latestCrop.current) return;
    // Initialization and resize callbacks can introduce floating point noise.
    // Opening then saving without interaction must return the exact saved data.
    onSave(initialFrame && !changed.current ? initialFrame : { crop: { ...latestCrop.current }, zoom });
  };

  return createPortal(
    <div className={styles.overlay}>
      <section ref={dialog} className={styles.dialog} role="dialog" aria-modal="true"
        aria-labelledby={titleId} aria-describedby={instructionsId} aria-busy={busy} tabIndex={-1}>
        <header className={styles.header}>
          <h2 id={titleId}>Crop cover</h2>
          <p id={instructionsId}>Drag the image to position it. Use the slider, scroll, or pinch to zoom.</p>
        </header>
        <div className={styles.editorBody}>
          <div className={styles.viewport} style={{ aspectRatio: NOTE_CARD_COVER_ASPECT_RATIO } as CSSProperties}>
            {!loadFailed && <Cropper image={imageUrl} crop={crop} zoom={zoom}
              aspect={NOTE_CARD_COVER_ASPECT_RATIO} objectFit="cover"
              minZoom={NOTE_COVER_MIN_ZOOM} maxZoom={maximumZoom} restrictPosition
              zoomWithScroll={!busy} showGrid={!busy} onCropChange={(next) => { if (!busy) setCrop(next); }} onZoomChange={zoomChanged}
              onCropComplete={rememberCrop} onCropAreaChange={rememberCrop}
              initialCroppedAreaPercentages={initialFrame?.crop}
              onMediaLoaded={mediaLoaded} setMediaSize={(size) => { media.current = size; }}
              onCropSizeChange={(size) => { viewport.current = size; }}
              onInteractionStart={() => { if (ready.current && !busy) changed.current = true; }}
              onWheelRequest={() => { if (!ready.current || busy) return false; changed.current = true; return true; }}
              onTouchRequest={() => !busy && ready.current}
              cropperProps={{ 'aria-label': 'Cover crop area', 'aria-disabled': busy || !loaded, tabIndex: busy ? -1 : 0 }}
              mediaProps={{ alt: '', onError: () => { ready.current = false; setLoadFailed(true); setLoaded(false); } }}
              style={{ containerStyle: { pointerEvents: busy ? 'none' : undefined }, cropAreaStyle: { borderColor: 'var(--glass-border)' } }}
            />}
            {!loaded && <div className={styles.status} role={loadFailed ? 'alert' : 'status'}>
              {loadFailed ? 'Could not load the cover image. Cancel and try again.' : 'Loading cover…'}
            </div>}
          </div>
          <div className={styles.zoomControl}>
            <label htmlFor={zoomId}>Zoom</label>
            <input id={zoomId} type="range" min={NOTE_COVER_MIN_ZOOM} max={maximumZoom} step="0.01"
              value={zoom} disabled={busy || !loaded} onChange={(event) => slideZoom(Number(event.currentTarget.value))}
              aria-valuetext={`${Math.round(zoom * 100)}%`} />
            <output htmlFor={zoomId}>{Math.round(zoom * 100)}%</output>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={styles.saveButton} onClick={save} disabled={busy || !loaded || loadFailed}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </section>
    </div>, document.body,
  );
}

export default NoteCoverEditor;
