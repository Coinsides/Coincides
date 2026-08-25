import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  CSSProperties,
} from 'react';
import { useEffect, useRef } from 'react';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import type {
  CanvasObject,
  CanvasPlacement,
} from '../types';
import { resolveCanvasObjectStyle } from '../objectStyleService';
import { getTextFlowContent } from '../textFlowService';
import {
  textFocusReceiptsEqual,
  type TextFocusReceipt,
} from '../textFocusReceipt';
import styles from '../../NoteDetail.module.css';

type ShapeType = 'rectangle' | 'ellipse';

export type ShapeInteractionPreview = {
  objectId: string;
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

type ShapeObjectLayerProps = {
  placements: CanvasPlacement[];
  canvasObjectById: Map<string, CanvasObject>;
  shapeTextBindingByObjectId: Map<string, {
    block: NoteBlock;
    text: string;
    saving: boolean;
    active: boolean;
    autoFocus: boolean;
  }>;
  selectedObjectId: string | null;
  interactionPreview: ShapeInteractionPreview;
  layoutMode: boolean;
  readOnly: boolean;
  onShapePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onShapeResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
    placement: CanvasPlacement,
  ) => void;
  onShapePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onShapePointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onShapeContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    canvasObject: CanvasObject,
  ) => void;
  onShapeTextFocus: (receipt: TextFocusReceipt) => void;
  onShapeTextBlur: (receipt: TextFocusReceipt) => void;
  onShapeTextChange: (
    block: NoteBlock,
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => void;
  onShapeTextSave: (
    objectId: string,
    block: NoteBlock,
    value: string,
  ) => Promise<BlockSaveOutcome | null>;
};

function shapeTypeFromCanvasObject(object: CanvasObject | undefined): ShapeType {
  return object?.metadata?.shapeType === 'ellipse' || object?.metadata?.shape_type === 'ellipse'
    ? 'ellipse'
    : 'rectangle';
}

export function ShapeObjectLayer({
  placements,
  canvasObjectById,
  shapeTextBindingByObjectId,
  selectedObjectId,
  interactionPreview,
  layoutMode,
  readOnly,
  onShapePointerDown,
  onShapeResizePointerDown,
  onShapePointerMove,
  onShapePointerEnd,
  onShapeContextMenu,
  onShapeTextFocus,
  onShapeTextBlur,
  onShapeTextChange,
  onShapeTextSave,
}: ShapeObjectLayerProps) {
  const focusedReceiptRef = useRef<TextFocusReceipt | null>(null);
  const onShapeTextBlurRef = useRef(onShapeTextBlur);
  onShapeTextBlurRef.current = onShapeTextBlur;

  useEffect(() => () => {
    const receipt = focusedReceiptRef.current;
    if (receipt) onShapeTextBlurRef.current(receipt);
  }, []);

  return (
    <>
      {placements.map((placement) => {
        const canvasObject = canvasObjectById.get(placement.objectId);
        if (!canvasObject) return null;
        const shapeType = shapeTypeFromCanvasObject(canvasObject);
        const textBinding = shapeTextBindingByObjectId.get(canvasObject.objectId) || null;
        const textBindingFlow = textBinding ? getTextFlowContent(textBinding.block.content_json) : null;
        const textBindingFocusReceipt = textBinding ? {
          blockId: textBinding.block.id,
          textFlowId: textFlowIdForBlock(textBinding.block.id),
          textUnitId: textBindingFlow?.units[0]?.id || 'tu-1',
        } satisfies TextFocusReceipt : null;
        const selected = selectedObjectId === canvasObject.objectId;
        const resolvedStyle = resolveCanvasObjectStyle(canvasObject);
        const preview = interactionPreview?.objectId === canvasObject.objectId
          ? interactionPreview
          : null;
        const styleVars = {
          '--canvas-object-fill': resolvedStyle.fill,
          '--canvas-object-stroke': resolvedStyle.stroke,
          '--canvas-object-stroke-width': `${resolvedStyle.strokeWidth}px`,
          '--canvas-object-border-radius': `${resolvedStyle.borderRadius}px`,
          '--canvas-object-opacity': resolvedStyle.opacity,
          '--canvas-object-text-inset': `${resolvedStyle.textInset ?? 10}px`,
        } as CSSProperties & Record<string, string | number>;
        return (
          <div
            key={canvasObject.objectId}
            className={`${styles.canvasShapeObject} ${styles[resolvedStyle.cssClassName]} ${shapeType === 'ellipse' ? styles.canvasShapeEllipse : styles.canvasShapeRectangle} ${selected ? styles.canvasShapeSelected : ''} ${layoutMode && !readOnly ? styles.canvasShapeOperable : ''}`}
            data-canvas-shape="true"
            data-canvas-shape-object="true"
            data-canvas-object-id={canvasObject.objectId}
            data-canvas-object-kind="shape"
            data-canvas-object-backing={canvasObject.backing}
            data-canvas-object-style-preset={resolvedStyle.presetId}
            data-canvas-object-presentation={resolvedStyle.presetId === 'shape.sticky_note' ? 'sticky_note' : 'shape'}
            data-canvas-shape-has-text={textBinding ? 'true' : 'false'}
            data-canvas-shape-type={shapeType}
            data-canvas-shape-selected={selected ? 'true' : 'false'}
            data-source-content-read-only={readOnly ? 'true' : 'false'}
            onPointerDown={readOnly ? undefined : (event) => onShapePointerDown(event, canvasObject, placement)}
            onPointerMove={readOnly ? undefined : onShapePointerMove}
            onPointerUp={readOnly ? undefined : onShapePointerEnd}
            onPointerCancel={readOnly ? undefined : onShapePointerEnd}
            onContextMenu={readOnly ? (event) => event.preventDefault() : (event) => onShapeContextMenu(event, canvasObject)}
            style={{
              ...styleVars,
              left: preview?.x ?? placement.x,
              top: preview?.y ?? placement.y,
              width: preview?.width ?? placement.width,
              height: preview?.height ?? placement.height,
              transform: `rotate(${placement.rotation || 0}deg)`,
              zIndex: Math.max(4, placement.zIndex),
            }}
          >
            {textBinding && (
              <textarea
                ref={(textarea) => {
                  if (!textarea || !textBinding.autoFocus) return;
                  textarea.focus({ preventScroll: true });
                  const caret = textarea.value.length;
                  textarea.setSelectionRange(caret, caret);
                }}
                className={`${styles.canvasShapeTextArea} ${textBinding.active ? styles.canvasShapeTextAreaActive : ''}`}
                data-canvas-shape-text="true"
                aria-label="Shape text"
                value={textBinding.text}
                disabled={textBinding.saving}
                readOnly={readOnly}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.stopPropagation()}
                onFocus={() => {
                  if (!textBindingFocusReceipt) return;
                  focusedReceiptRef.current = textBindingFocusReceipt;
                  onShapeTextFocus(textBindingFocusReceipt);
                }}
                onChange={readOnly ? undefined : (event) => {
                  onShapeTextChange(
                    textBinding.block,
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                    event.currentTarget,
                  );
                }}
                onBlur={async (event) => {
                  const value = event.currentTarget.value;
                  if (textBindingFocusReceipt) {
                    if (textFocusReceiptsEqual(focusedReceiptRef.current, textBindingFocusReceipt)) {
                      focusedReceiptRef.current = null;
                    }
                    onShapeTextBlur(textBindingFocusReceipt);
                  }
                  if (!readOnly) {
                    const outcome = await onShapeTextSave(canvasObject.objectId, textBinding.block, value);
                    if (outcome && outcome.status !== 'saved') return;
                  }
                }}
                onKeyDown={readOnly ? undefined : async (event) => {
                  event.stopPropagation();
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    const textarea = event.currentTarget;
                    const outcome = await onShapeTextSave(
                      canvasObject.objectId,
                      textBinding.block,
                      textarea.value,
                    );
                    if (outcome && outcome.status !== 'saved') return;
                    textarea.blur();
                  }
                }}
                data-block-id={textBindingFocusReceipt?.blockId}
                data-text-flow-id={textBindingFocusReceipt?.textFlowId}
                data-text-unit-id={textBindingFocusReceipt?.textUnitId}
              />
            )}
            {selected && layoutMode && !readOnly && (
              <div
                className={styles.canvasShapeResizeHandle}
                data-canvas-shape-resize-handle="true"
                onPointerDown={(event) => onShapeResizePointerDown(event, canvasObject, placement)}
                onPointerMove={onShapePointerMove}
                onPointerUp={onShapePointerEnd}
                onPointerCancel={onShapePointerEnd}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
