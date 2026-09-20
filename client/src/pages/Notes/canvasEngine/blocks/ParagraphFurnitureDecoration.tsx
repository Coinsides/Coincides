import type { ParagraphFurniture } from '../paragraphFurniture';
import { paragraphFurnitureGeometry } from '../paragraphFurniture';
import styles from './ParagraphFurniture.module.css';

export function ParagraphFurnitureDecoration({ value, fragments }: {
  value: ParagraphFurniture;
  fragments: Array<{ id: string; left: number; top: number; width: number; height: number; first: boolean; last: boolean; sourceReferencesHeight?: number }>;
}) {
  return <>{fragments.map((fragment) => {
    const geometry = paragraphFurnitureGeometry(value, fragment.width);
    return <div key={fragment.id} data-paragraph-furniture={value.variant}
      className={`${styles.fragment} ${styles[value.variant]}`}
      style={{ left: fragment.left, top: fragment.top, width: fragment.width, height: fragment.height }}>
      {fragment.first && (value.variant === 'quote' ? <span className={styles.stamp}>引</span>
        : <span className={styles.label} title={value.label}>{value.label}</span>)}
      {fragment.last && value.variant === 'quote' && value.source && <p className={styles.source}
        style={{ bottom: 8 + (fragment.sourceReferencesHeight ?? 0), minHeight: geometry.sourceHeight }}>{value.source}</p>}
    </div>;
  })}</>;
}
