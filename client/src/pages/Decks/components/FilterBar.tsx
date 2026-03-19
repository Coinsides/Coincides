import { Search, X } from 'lucide-react';
import { templateOptions } from './types';
import styles from '../DeckDetail.module.css';

interface Tag {
  id: string;
  name: string;
}

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  templateFilter: string;
  setTemplateFilter: (v: string) => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  importanceFilter: number;
  setImportanceFilter: (v: number) => void;
  tags: Tag[];
}

export default function FilterBar({
  search, setSearch,
  templateFilter, setTemplateFilter,
  tagFilter, setTagFilter,
  importanceFilter, setImportanceFilter,
  tags,
}: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearSearch} onClick={() => setSearch('')}>
            <X size={12} />
          </button>
        )}
      </div>
      <div className={styles.pills}>
        {templateOptions.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.pill} ${templateFilter === opt.value ? styles.activePill : ''}`}
            onClick={() => setTemplateFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <select
        className={styles.filterSelect}
        value={tagFilter}
        onChange={(e) => setTagFilter(e.target.value)}
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select
        className={styles.filterSelect}
        value={importanceFilter}
        onChange={(e) => setImportanceFilter(Number(e.target.value))}
      >
        <option value={0}>Any importance</option>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>{'★'.repeat(n)}</option>
        ))}
      </select>
    </div>
  );
}
