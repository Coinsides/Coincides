import type { CSSProperties } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import { readTableBlockPayload } from '../tableBlockService';
import styles from './TableBlockProjection.module.css';

export function TableBlockProjection({ block, print = false, style }: {
  block: Pick<NoteBlock, 'block_type' | 'content_json'>;
  print?: boolean;
  style?: CSSProperties;
}) {
  const payload = readTableBlockPayload(block);
  if (!payload) return <div role="status" className={styles.invalid}>Table content could not be read.</div>;
  return <div className={`${styles.viewport} ${print ? styles.print : ''}`} style={style}
    data-table-block="true" data-table-print-clip={print ? 'true' : undefined}
    tabIndex={print ? undefined : 0} role={print ? undefined : 'region'}
    aria-label={print ? undefined : `${payload.caption || 'Table'} — scroll horizontally for more columns`}>
    <table className={styles.table} aria-label={payload.caption || 'Table'}>
      {payload.caption && <caption>{payload.caption}</caption>}
      {payload.headers.length > 0 && <thead><tr>{payload.headers.map((cell, index) =>
        <th scope="col" key={index}>{cell}</th>)}</tr></thead>}
      <tbody>{payload.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) =>
        <td key={columnIndex}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
