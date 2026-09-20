import { useEffect, useId, useState, type CSSProperties } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import { mediaBlockAlt, readMediaBlockMetadata } from '../mediaBlockService';
import { mediaImageGeometry } from '../mediaImageEdit';
import styles from './MediaBlockProjection.module.css';

/** Media owns its stored rectangle; it never participates in text measurement. */
export function MediaBlockProjection({ block }: { block: NoteBlock }) {
  const clipId = useId();
  const metadata = readMediaBlockMetadata(block);
  const assetId = metadata?.asset_id ?? '';
  const alt = mediaBlockAlt(block);
  const [read, setRead] = useState<{ assetId: string; url?: string; failed?: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;
    setRead(null);
    if (!assetId) return;
    void loadCanvasImageAssetBlobUrl(assetId).then((url) => {
      if (!active) {
        URL.revokeObjectURL(url);
        return;
      }
      currentUrl = url;
      setRead({ assetId, url });
    }).catch(() => {
      if (active) setRead({ assetId, failed: true });
    });
    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [assetId]);
  const loaded = read?.assetId === assetId ? read : null;
  const failed = !assetId || loaded?.failed;
  if (failed || !loaded?.url) {
    const message = failed ? `${alt}: Image could not be loaded. Reopen the note to retry.` : `Loading ${alt}…`;
    return <div className={styles.status} role="status" title={message}
      data-media-block-state={failed ? 'failed' : 'loading'}><span>{message}</span></div>;
  }
  const edit = metadata?.edit_v1;
  if (metadata && edit && (edit.rotation !== 0 || edit.crop !== null || edit.zoom !== null)) {
    const geometry = mediaImageGeometry(edit, { width: metadata.naturalWidth, height: metadata.naturalHeight });
    return <svg className={styles.media} role="img" aria-label={alt} viewBox={geometry.viewBox}
      preserveAspectRatio="xMidYMid meet" data-media-block-state="loaded" data-media-block-asset={assetId}
      data-media-image-rotation={edit.rotation}>
      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><rect {...geometry.window} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <image href={loaded.url} width={metadata.naturalWidth} height={metadata.naturalHeight}
          transform={geometry.transform || undefined} onError={() => setRead({ assetId, failed: true })} />
      </g>
    </svg>;
  }
  return <img className={styles.media} src={loaded.url} alt={alt} draggable={false}
    data-media-block-state="loaded" data-media-block-asset={assetId}
    onError={() => setRead({ assetId, failed: true })} />;
}

/** Honest print/export fallback; it deliberately has no asset-loading lifecycle. */
export function MediaBlockPlaceholder({ block, style }: { block: NoteBlock; style?: CSSProperties }) {
  const alt = mediaBlockAlt(block);
  return <div className={styles.placeholder} style={style} role="img" aria-label={alt}
    data-media-block-placeholder="true" title={alt}><span>{alt}</span></div>;
}
