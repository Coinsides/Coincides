import type { CSSProperties } from 'react';
import { useInlineLinks } from '../InlineLinkContext';
import { hasInlineLinkRange, inlineLinksForUnit, readInlineLinkTarget } from '../inlineLinkService';
import type { TextBlockContentV1, TextUnit } from '../runtimeDataTypes';
import styles from '../../NoteDetail.module.css';

/** Text-only presentation over the native editor; never derives or repairs stored anchors. */
export function InlineLinkTextLayer({ flow, unit, start = 0, end = unit.text.length, className = '', style, layoutMode }: {
  flow: TextBlockContentV1; unit: TextUnit; start?: number; end?: number; className?: string;
  style?: CSSProperties; layoutMode?: boolean;
}) {
  const host = useInlineLinks();
  const records = inlineLinksForUnit(flow, unit.id);
  if (!records.length) return null;
  const anchored = records.filter((record) => hasInlineLinkRange(record, unit));
  const boundaries = [...new Set([start, end, ...anchored.flatMap((record) => [
    Math.max(start, Math.min(end, record.anchor_range!.start)), Math.max(start, Math.min(end, record.anchor_range!.end)),
  ])])].sort((a, b) => a - b);
  return <>
    <div className={`${styles.pageTextArea} ${className} ${styles.inlineLinkTextLayer}`} style={style}
      data-inline-link-layer="true">
      {boundaries.slice(0, -1).map((low, index) => {
        const high = boundaries[index + 1];
        const text = unit.text.slice(low, high);
        // Later human insertions take visual precedence; both records remain preserved.
        const record = [...anchored].reverse().find((entry) => entry.anchor_range!.start <= low && entry.anchor_range!.end >= high);
        if (!record) return <span key={low} aria-hidden="true">{text}</span>;
        const target = readInlineLinkTarget(record.field_values);
        const resolved = Boolean(target && host?.resolve(target));
        const pending = target?.target_kind === 'note' && host?.notesState !== 'ready';
        const title = resolved ? '打开链接' : pending ? '链接目标暂不可用' : '链接目标已失效';
        return resolved && !layoutMode ? <a key={low} role="link" tabIndex={0} title={title}
          className={styles.inlineLink} data-inline-link-id={record.id}
          onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (target) void host?.navigate(target); }}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); event.stopPropagation(); if (target) void host?.navigate(target);
          } }}>{text}</a>
          : <span key={low} title={title} className={resolved ? styles.inlineLink : styles.inlineLinkUnavailable}
            data-inline-link-id={record.id} data-inline-link-degraded={resolved ? undefined : 'target'}>{text}</span>;
      })}
    </div>
    {start === 0 && records.some((record) => !hasInlineLinkRange(record, unit)) && <span
      className={styles.inlineLinkAnchorLost} data-inline-link-degraded="anchor" role="note"
      title="链接选区已改变；原链接证据保留" aria-label="链接选区已改变；原链接证据保留">↛</span>}
  </>;
}
