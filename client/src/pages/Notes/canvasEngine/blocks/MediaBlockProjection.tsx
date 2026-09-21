import { useId, type CSSProperties } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { useMediaImageAsset } from '../hooks/useMediaImageAsset';
import { mediaBlockAlt, readMediaBlockMetadata } from '../mediaBlockService';
import { mediaImageGeometry } from '../mediaImageEdit';
import styles from './MediaBlockProjection.module.css';

/** Media owns its stored rectangle; it never participates in text measurement. */
export function MediaBlockProjection({ block }: { block: NoteBlock }) {
  const clipId = useId();
  const metadata = readMediaBlockMetadata(block);
  const assetId = metadata?.asset_id ?? '';
  const alt = mediaBlockAlt(block);
  const { read, onError } = useMediaImageAsset(assetId);
  if (read.status !== 'loaded') {
    const failed = read.status === 'failed';
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
        <image href={read.url} width={metadata.naturalWidth} height={metadata.naturalHeight}
          transform={geometry.transform || undefined} onError={onError} />
      </g>
    </svg>;
  }
  return <img className={styles.media} src={read.url} alt={alt} draggable={false}
    data-media-block-state="loaded" data-media-block-asset={assetId}
    onError={onError} />;
}

/** Explicit non-loading fallback for callers that only need a labelled rectangle. */
export function MediaBlockPlaceholder({ block, style }: { block: NoteBlock; style?: CSSProperties }) {
  const alt = mediaBlockAlt(block);
  return <div className={styles.placeholder} style={style} role="img" aria-label={alt}
    data-media-block-placeholder="true" title={alt}><span>{alt}</span></div>;
}
