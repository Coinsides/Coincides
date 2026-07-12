import {
  useEffect,
  useState,
  type CSSProperties,
} from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import type {
  CanvasObject,
  CanvasPlacement,
  ImageCanvasObject,
} from '../types';
import type { ShapeInteractionPreview } from './ShapeObjectLayer';
import styles from '../../NoteDetail.module.css';

type ImageObjectLayerProps = {
  placements: CanvasPlacement[];
  canvasObjectById: Map<string, CanvasObject>;
  imageObjectById: Map<string, ImageCanvasObject>;
  selectedObjectId: string | null;
  interactionPreview: ShapeInteractionPreview;
  layoutMode: boolean;
  readOnly: boolean;
  onImagePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onImageResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onImagePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onImagePointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onImageContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
  ) => void;
};

function CanvasImageMedia({
  imageObject,
}: {
  imageObject: ImageCanvasObject;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;
    setObjectUrl(null);

    loadCanvasImageAssetBlobUrl(imageObject.assetId)
      .then((url) => {
        currentObjectUrl = url;
        if (active) {
          setObjectUrl(url);
          return;
        }
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) setObjectUrl(imageObject.asset.blobUrl);
      });

    return () => {
      active = false;
      if (currentObjectUrl && currentObjectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [imageObject.asset.blobUrl, imageObject.assetId]);

  return (
    <img
      className={styles.canvasImageMedia}
      src={objectUrl || imageObject.asset.blobUrl}
      alt={imageObject.altText || imageObject.caption || imageObject.asset.filename}
      draggable={false}
      data-canvas-image-media-loaded={objectUrl ? 'true' : 'false'}
      style={{ objectFit: imageObject.fit } as CSSProperties}
    />
  );
}

export function ImageObjectLayer({
  placements,
  canvasObjectById,
  imageObjectById,
  selectedObjectId,
  interactionPreview,
  layoutMode,
  readOnly,
  onImagePointerDown,
  onImageResizePointerDown,
  onImagePointerMove,
  onImagePointerEnd,
  onImageContextMenu,
}: ImageObjectLayerProps) {
  return (
    <>
      {placements.map((placement) => {
        const canvasObject = canvasObjectById.get(placement.objectId);
        const imageObject = imageObjectById.get(placement.objectId);
        if (!canvasObject || !imageObject) return null;
        const selected = selectedObjectId === canvasObject.objectId;
        const preview = interactionPreview?.objectId === canvasObject.objectId ? interactionPreview : null;
        return (
          <div
            key={canvasObject.objectId}
            className={`${styles.canvasImageObject} ${selected ? styles.canvasImageSelected : ''} ${layoutMode && !readOnly ? styles.canvasImageOperable : ''}`}
            data-canvas-image="true"
            data-canvas-image-object="true"
            data-canvas-object-id={canvasObject.objectId}
            data-canvas-object-kind="image"
            data-canvas-object-backing="asset"
            data-canvas-object-presentation="image"
            data-canvas-image-fit={imageObject.fit}
            data-canvas-image-selected={selected ? 'true' : 'false'}
            data-source-content-read-only={readOnly ? 'true' : 'false'}
            onPointerDown={readOnly ? undefined : (event) => onImagePointerDown(event, canvasObject, placement)}
            onPointerMove={readOnly ? undefined : onImagePointerMove}
            onPointerUp={readOnly ? undefined : onImagePointerEnd}
            onPointerCancel={readOnly ? undefined : onImagePointerEnd}
            onContextMenu={readOnly ? (event) => event.preventDefault() : (event) => onImageContextMenu(event, canvasObject)}
            style={{
              left: preview?.x ?? placement.x,
              top: preview?.y ?? placement.y,
              width: preview?.width ?? placement.width,
              height: preview?.height ?? placement.height,
              transform: `rotate(${placement.rotation || 0}deg)`,
              zIndex: Math.max(4, placement.zIndex),
            }}
          >
            <CanvasImageMedia imageObject={imageObject} />
            {imageObject.caption && (
              <div className={styles.canvasImageCaption}>
                {imageObject.caption}
              </div>
            )}
            {selected && layoutMode && !readOnly && (
              <div
                className={styles.canvasImageResizeHandle}
                data-canvas-image-resize-handle="true"
                onPointerDown={(event) => onImageResizePointerDown(event, canvasObject, placement)}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerEnd}
                onPointerCancel={onImagePointerEnd}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
