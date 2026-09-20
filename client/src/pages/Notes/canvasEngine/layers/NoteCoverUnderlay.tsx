import { useEffect, useState } from 'react';
import type { NoteCoverFrame } from '@shared/types';
import { coverCropForViewport, type CoverSize } from '../../../Courses/noteCover/geometry';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';

export interface NoteCoverUnderlayProps {
  assetId: string;
  frame?: NoteCoverFrame;
  width: number;
  height: number;
}

const originalFrame: NoteCoverFrame = { crop: { x: 0, y: 0, width: 100, height: 100 }, zoom: 1 };

/** The page consumes the original asset, using the same percentage viewport as the card. */
export function NoteCoverUnderlay({ assetId, frame = originalFrame, width, height }: NoteCoverUnderlayProps) {
  const [image, setImage] = useState<{ assetId: string; url?: string; size?: CoverSize; failed?: boolean }>({ assetId });
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setImage({ assetId });
    void loadCanvasImageAssetBlobUrl(assetId).then((url) => {
      if (!active) { URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setImage({ assetId, url });
    }).catch(() => { if (active) setImage({ assetId, failed: true }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  const current = image.assetId === assetId ? image : undefined;
  const crop = current?.size ? coverCropForViewport(frame, current.size, { width, height }) : frame.crop;

  return <div data-note-cover-underlay data-cover-asset-id={assetId}
    data-cover-status={current?.failed ? 'error' : current?.size ? 'ready' : 'loading'} aria-hidden="true"
    style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', pointerEvents: 'none' }}>
    {current?.url && !current.failed && <img src={current.url} alt="" draggable={false}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalHeight > 0) setImage((value) => value.assetId === assetId
          ? { ...value, size: { width: naturalWidth, height: naturalHeight } } : value);
      }}
      onError={() => setImage((value) => value.assetId === assetId ? { ...value, failed: true } : value)}
      style={{ position: 'absolute', display: 'block', maxWidth: 'none', maxHeight: 'none',
        width: `${10000 / crop.width}%`, height: `${10000 / crop.height}%`,
        left: `${-100 * crop.x / crop.width}%`, top: `${-100 * crop.y / crop.height}%` }} />}
  </div>;
}
