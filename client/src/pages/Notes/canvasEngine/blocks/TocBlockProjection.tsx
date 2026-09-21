import { useTocProjection } from '../TocProjectionContext';
import { TYPOGRAPHY_UNIT_INDENT_PX } from '../typographyMeasurementService';
import styles from './TocBlockProjection.module.css';

/** A live agenda on paper; neither chapter titles nor page numbers are persisted. */
export function TocBlockProjection({ print = false, interactive = true }: { print?: boolean; interactive?: boolean }) {
  const { agenda, pageNumbers, onSelectChapter } = useTocProjection();
  return <section className={styles.toc} aria-label="目录" data-toc-projection={print ? 'print' : 'reading'}>
    <div className={styles.title}>目录</div>
    {agenda.length ? <div role="list">
      {agenda.map((entry) => {
        const content = <>
          <span className={styles.chapter}>{entry.title || '未命名章节'}</span>
          {print && <span className={styles.page} data-toc-page-number={pageNumbers?.get(entry.id)}>
            {pageNumbers?.get(entry.id) ?? '—'}
          </span>}
        </>;
        return <div role="listitem" key={entry.id} data-toc-level={entry.level}
          style={{ paddingInlineStart: (entry.number.length - 1) * TYPOGRAPHY_UNIT_INDENT_PX }}>
          {!print && interactive && onSelectChapter
            ? <button type="button" className={styles.entry} onClick={(event) => {
              event.stopPropagation(); onSelectChapter(entry.id);
            }}>{content}</button>
            : <div className={styles.entry}>{content}</div>}
        </div>;
      })}
    </div> : <div className={styles.empty}>添加章节标题后，目录会自动显示。</div>}
  </section>;
}
