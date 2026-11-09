// A-25 ②a: a block whose typing save failed says so on the block itself, for as long as it is so, instead of a
// toast that is gone in a moment. The save is usually asked again by itself (useTextFlowHistory), but not after the
// server refused it (401 / 403 / 409), so the mark does not promise it (A-25 M1); Retry asks now, Copy puts the
// block's text on the clipboard. It goes when the save goes through.
interface BlockSaveFailedMarkProps {
  text: string;
  onRetry?: () => void;
}

export function BlockSaveFailedMark({ text, onRetry }: BlockSaveFailedMarkProps) {
  return (
    <div
      role="status"
      data-block-save-failed="true"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => { event.stopPropagation(); event.preventDefault(); }}
      style={{
        position: 'absolute', right: 0, top: -26, zIndex: 6, display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 8px', borderRadius: 6, fontSize: 12, lineHeight: '18px', whiteSpace: 'nowrap',
        background: 'var(--color-warning-bg, #fff4e5)', color: 'var(--color-warning-text, #8a4b00)',
        border: '1px solid var(--color-warning-border, #f0c27a)',
      }}
    >
      <span>Not saved yet</span>
      {onRetry && <button type="button" onClick={onRetry} style={{ font: 'inherit', textDecoration: 'underline', background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}>Retry</button>}
      <button
        type="button"
        onClick={() => { void navigator.clipboard?.writeText(text).catch(() => {}); }}
        style={{ font: 'inherit', textDecoration: 'underline', background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer' }}
      >
        Copy
      </button>
    </div>
  );
}
