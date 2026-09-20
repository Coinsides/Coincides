import { useEffect, useRef, useState } from 'react';
import { createCenteredNoteCoverFrame, type NoteCoverFrame } from '@shared/types';
import { upgradeNoteBindingSettings, type NoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import { NoteCoverEditor } from '../../../Courses/noteCover/NoteCoverEditor';
import { loadCanvasImageAssetBlobUrl, uploadCanvasImageAsset } from '../canvasAssetRepository';
import { addNoteCoverPage, removeNoteCoverPage } from '../noteCoverPageCollection';
import type { PageFrameCollectionModel } from '../types';

export interface NoteCoverPageControlsProps {
  noteId: string;
  metadata?: unknown;
  collection: PageFrameCollectionModel;
  value: NoteBindingSettings;
  onChange: (value: NoteBindingSettings) => void;
  onSave: (value: NoteBindingSettings, collection?: PageFrameCollectionModel) => Promise<void>;
  onAddBinding: (field: 'title' | 'description') => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}

export function NoteCoverPageControls({ noteId, collection, value, onChange, onSave, onAddBinding, onBusyChange }: NoteCoverPageControlsProps) {
  const settings = upgradeNoteBindingSettings(value);
  const coverId = settings.coverPage.frameId;
  const frame = collection.pageFrames.find((frame) => frame.id === coverId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ assetId: string; url: string; frame?: NoteCoverFrame } | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const naturalSize = useRef<{ width: number; height: number } | null>(null);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (inFlight.current) { inFlight.current = false; busyCallback.current?.(false); }
    };
  }, []);
  useEffect(() => () => { if (editing) URL.revokeObjectURL(editing.url); }, [editing]);
  const act = async (operation: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); busyCallback.current?.(true);
    try { await operation(); } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : '封面未保存，请重试。'); }
    finally {
      inFlight.current = false;
      if (alive.current) { setBusy(false); busyCallback.current?.(false); }
    }
  };
  const openAsset = async (assetId: string, initialFrame?: NoteCoverFrame) => {
    naturalSize.current = null;
    const url = await loadCanvasImageAssetBlobUrl(assetId);
    if (alive.current) setEditing({ assetId, url, frame: initialFrame });
    else URL.revokeObjectURL(url);
  };
  return <section aria-label="封面页设置">
    <strong>封面页</strong>
    {!coverId ? <button type="button" disabled={busy} onClick={() => void act(async () => {
      const frameId = `cover-${crypto.randomUUID()}`;
      const next = { ...settings, coverPage: { ...settings.coverPage, frameId }, dropFolioOnCover: true };
      await onSave(next, addNoteCoverPage(collection, frameId));
      if (alive.current) onChange(next);
    })}>添加封面页</button> : <>
      <p>第 0 页可自由摆放文字与媒体，页眉、页脚和页码静默。</p>
      <button type="button" disabled={busy} onClick={() => void act(() => onAddBinding('title'))}>添加题名件</button>
      <button type="button" disabled={busy} onClick={() => void act(() => onAddBinding('description'))}>添加述名件</button>
      <label><input type="checkbox" checked={settings.coverPage.exportIncluded} disabled={busy}
        onChange={(event) => onChange({ ...settings, coverPage: { ...settings.coverPage, exportIncluded: event.target.checked } })} />导出包含封面</label>
      <label>封面图<input aria-label="选择纸页封面图" type="file" accept="image/*" disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
          if (!file) return;
          void act(async () => {
            const asset = await uploadCanvasImageAsset({ noteId, file, source: 'note_cover_upload' });
            await openAsset(asset.assetId);
          });
        }} /></label>
      {settings.cover && <>
        <button type="button" disabled={busy} onClick={() => void act(() => openAsset(settings.cover!.assetId, settings.cover!.page))}>调整封面取景</button>
        <button type="button" disabled={busy} onClick={() => onChange({ ...settings, cover: null })}>移除封面图</button>
      </>}
      <p>移除封面页时，页上内容与墨水移交首内容页；题名、述名和原图保留。</p>
      <button type="button" disabled={busy} onClick={() => void act(async () => {
        const next = { ...settings, coverPage: { ...settings.coverPage, frameId: null } };
        await onSave(next, removeNoteCoverPage(collection, coverId));
        if (alive.current) onChange(next);
      })}>移除封面页</button>
    </>}
    {busy && <p role="status">正在保存封面…</p>}
    {error && <p role="alert">{error}</p>}
    {editing && frame && <NoteCoverEditor imageUrl={editing.url} initialFrame={editing.frame}
      aspectRatio={frame.width / frame.height} frameKind="page" error={error || undefined}
      onImageLoaded={(size) => { naturalSize.current = size; }} onCancel={() => setEditing(null)}
      onSave={(page) => {
        const card = settings.cover?.card ?? (naturalSize.current
          ? createCenteredNoteCoverFrame(naturalSize.current.width, naturalSize.current.height) : undefined);
        if (!card) { setError('封面图片尚未加载，请稍后重试。'); return; }
        onChange({ ...settings, cover: { ...settings.cover, assetId: editing.assetId, card, page } }); setEditing(null);
      }} />}
  </section>;
}
