import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, RotateCcw, Trash2 } from 'lucide-react';
import { NOTE_CARD_COVER_ASPECT_RATIO, readNoteCover, type NoteCover, type NoteCoverFrame } from '@shared/types';
import { loadCanvasImageAssetBlobUrl, uploadCanvasImageAsset } from '../../Notes/canvasEngine/canvasAssetRepository';
import { NoteCoverEditor } from './NoteCoverEditor';
import { saveNoteCover } from './repository';
import cardStyles from '../CourseDetail.module.css';
import styles from './ProjectNoteCard.module.css';

export interface ProjectNoteSummary {
  id: string;
  title: string;
  description: string | null;
  updated_at: string;
  metadata?: unknown;
}

function useCoverBlob(assetId: string | undefined) {
  const [value, setValue] = useState<{ assetId?: string; url?: string; error?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setValue({ assetId });
    if (assetId) void loadCanvasImageAssetBlobUrl(assetId).then((url) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setValue({ assetId, url });
    }).catch(() => {
      if (active) setValue({ assetId, error: '无法加载封面，请重试。' });
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId, attempt]);
  return { ...(value.assetId === assetId ? value : {}), retry: () => setAttempt((n) => n + 1) };
}

function CoverUploadDialog({ title, busy, error, hasCover, onFile, onRemove, onCancel, loadingCover, onRetry }: {
  title: string; busy: boolean; error: string | null; hasCover: boolean;
  onFile: (file: File) => void; onRemove: () => void; onCancel: () => void;
  loadingCover?: boolean; onRetry: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-label={title}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className={styles.header}>
      <h2>{title}</h2>
      {hasCover && <button type="button" className={styles.tool} disabled={busy} onClick={onRemove}>移除</button>}
    </div>
    {loadingCover ? <p role="status">{error ? '封面尚未加载' : '正在加载封面…'}</p> : <div
      className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); if (!busy) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        // Without stopPropagation the drop also reaches the project-level
        // source-import drop zone and silently imports the cover image as a source.
        event.preventDefault(); event.stopPropagation(); setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}>
      <p>{busy ? '正在上传封面…' : '拖放图片到这里，或选择图片'}</p>
      <input aria-label="选择封面图片" type="file" accept="image/*" disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) onFile(file);
        }} />
    </div>}
    {/* Future gallery/link tabs belong to a later order; v1 only uploads. */}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {loadingCover && error && <button type="button" className={styles.tool} onClick={onRetry}>重试加载</button>}
    <div className={styles.actions}>
      <button type="button" className={styles.tool} disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </dialog>, document.body);
}

export function ProjectNoteCard({ note, status, busy, onOpen, onLifecycle, onCoverSaved, addToast }: {
  note: ProjectNoteSummary;
  status: 'active' | 'trashed';
  busy: boolean;
  onOpen: () => void;
  onLifecycle: () => void;
  onCoverSaved: () => Promise<void>;
  addToast: (type: 'success' | 'error', message: string) => void;
}) {
  const [cover, setCover] = useState(() => readNoteCover(note.metadata));
  const [modal, setModal] = useState<'upload' | 'crop' | null>(null);
  const [draft, setDraft] = useState<{ assetId: string; frame?: NoteCoverFrame; url?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(false);
  const localUrl = useRef<string>();
  const trigger = useRef<HTMLElement | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const blob = useCoverBlob(cover?.assetId);
  const editingBlob = useCoverBlob(modal === 'crop' && !draft?.url ? draft?.assetId : undefined);
  useEffect(() => { setCover(readNoteCover(note.metadata)); }, [note.id, note.metadata]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (localUrl.current) URL.revokeObjectURL(localUrl.current); };
  }, []);
  useEffect(() => {
    if (modal || !restoreFocus.current) return;
    restoreFocus.current = false;
    (trigger.current?.isConnected ? trigger.current : openButton.current)?.focus();
  }, [modal]);

  function close() {
    if (inFlight.current) return;
    restoreFocus.current = true;
    setModal(null); setDraft(null); setError(null);
    if (localUrl.current) { URL.revokeObjectURL(localUrl.current); localUrl.current = undefined; }
  }
  function open(kind: 'upload' | 'crop', button: HTMLElement) {
    trigger.current = button;
    setError(null);
    setDraft(kind === 'crop' && cover ? { assetId: cover.assetId, frame: cover.card } : null);
    setModal(kind);
  }
  async function upload(file: File) {
    if (inFlight.current) return;
    if (!file.type.startsWith('image/')) { setError('请选择图片文件。'); return; }
    inFlight.current = true; setSaving(true); setError(null);
    try {
      const asset = await uploadCanvasImageAsset({ noteId: note.id, file, source: 'note_cover_upload' });
      if (!alive.current) return;
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = URL.createObjectURL(file);
      setDraft({ assetId: asset.assetId, url: localUrl.current });
      setModal('crop');
    } catch {
      if (alive.current) setError('封面上传失败，请重试。');
    } finally { inFlight.current = false; if (alive.current) setSaving(false); }
  }
  async function persist(next: NoteCover | null) {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      await saveNoteCover(note.id, next);
      if (!alive.current) return;
      setCover(next);
      inFlight.current = false;
      close();
      addToast('success', next ? '封面已保存' : '封面已移除');
      try { await onCoverSaved(); }
      catch { addToast('error', '封面已保存，列表刷新失败，请刷新页面。'); }
    } catch {
      if (alive.current) {
        const message = '封面保存失败，请重试。';
        setError(message);
        if (!modal) addToast('error', message);
      }
    } finally { inFlight.current = false; if (alive.current) setSaving(false); }
  }
  const body = <>
    <div className={cardStyles.workspaceCardIcon}><FileText size={17} /></div>
    <div className={cardStyles.workspaceCardBody}>
      <div className={cardStyles.workspaceCardType}>Note</div>
      <div className={cardStyles.workspaceCardTitle}>{note.title}</div>
      {note.description && <div className={cardStyles.workspaceCardDesc}>{note.description}</div>}
      <div className={cardStyles.workspaceCardMeta}><span>Updated {new Date(note.updated_at).toLocaleDateString()}</span></div>
    </div>
  </>;
  const actionLabel = status === 'trashed' ? `Restore ${note.title}` : `Move ${note.title} to trash`;
  const imageUrl = draft?.url || editingBlob.url;
  return <div className={`${cardStyles.workspaceCard} ${styles.card} ${cover ? styles.withCover : ''}`} data-note-cover={cover ? 'present' : undefined}>
    <button ref={openButton} type="button" className={`${cardStyles.workspaceCardOpen} ${cover ? styles.openWithCover : ''}`}
      aria-label={`Open note ${note.title}`} onClick={onOpen}>
      {cover ? <>
        <span className={styles.banner} data-note-cover-banner style={{ aspectRatio: NOTE_CARD_COVER_ASPECT_RATIO }}>
          {blob.url ? <img src={blob.url} alt="" draggable={false} style={{
            width: `${10000 / cover.card.crop.width}%`, height: `${10000 / cover.card.crop.height}%`,
            left: `${-100 * cover.card.crop.x / cover.card.crop.width}%`,
            top: `${-100 * cover.card.crop.y / cover.card.crop.height}%`,
          }} /> : <span className={styles.placeholder}>{blob.error ? '封面加载失败' : '正在加载封面…'}</span>}
        </span>
        <div className={styles.content}>{body}</div>
      </> : body}
    </button>
    <button type="button" className={`${cardStyles.iconBtn} ${cardStyles.workspaceCardAction} ${styles.lifecycle} ${status === 'active' ? cardStyles.workspaceCardDangerAction : ''}`}
      aria-label={actionLabel} title={actionLabel} disabled={busy || saving} onClick={onLifecycle}>
      {status === 'trashed' ? <RotateCcw size={13} /> : <Trash2 size={13} />}
    </button>
    {status === 'active' && <div className={`${styles.toolbar} ${!cover ? styles.withoutCoverToolbar : ''}`} role="group" aria-label={`封面操作：${note.title}`}>
      {cover && <button type="button" className={styles.tool} disabled={saving} onClick={(e) => open('crop', e.currentTarget)}>重新取景</button>}
      <button type="button" className={styles.tool} disabled={saving} onClick={(e) => open('upload', e.currentTarget)}>{cover ? '更换封面' : '添加封面'}</button>
      {cover && <button type="button" className={styles.tool} disabled={saving} onClick={() => void persist(null)}>移除</button>}
    </div>}
    {modal && (modal === 'crop' && draft && imageUrl ? <NoteCoverEditor imageUrl={imageUrl} initialFrame={draft.frame}
      busy={saving} error={error} onCancel={close} onSave={(frame) => void persist({ assetId: draft.assetId, card: frame })} />
      : <CoverUploadDialog title={modal === 'crop' ? '重新取景' : cover ? '更换封面' : '添加封面'} busy={saving}
        error={error || (modal === 'crop' ? editingBlob.error || null : null)} hasCover={Boolean(cover)}
        loadingCover={modal === 'crop'} onRetry={editingBlob.retry} onFile={(file) => void upload(file)}
        onRemove={() => void persist(null)} onCancel={close} />)}
  </div>;
}
