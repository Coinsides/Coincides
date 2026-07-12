import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { SourceDetailDialog } from './SourceDetailDialog';
import { SourceDeleteDialog } from './SourceDeleteDialog';
import { SourceList } from './SourceList';
import { SourceUploader } from './SourceUploader';
import {
  deriveSourceExperienceState,
  sourceMatchesQuery,
  type SourceExperienceState,
  type SourceFormat,
  type SourceRecordDetail,
} from './sourceExperienceModel';
import { useSourceActions } from './useSourceActions';
import { useSourceCollection } from './useSourceCollection';
import { deleteSource } from './sourceApi';
import { useUIStore } from '@/stores/uiStore';
import styles from './SourceLibrary.module.css';

type StateFilter = 'all' | SourceExperienceState;
type TypeFilter = 'all' | SourceFormat;

export default function SourceLibraryPage() {
  const collection = useSourceCollection({ originEntryKind: 'library_upload' });
  const addToast = useUIStore((state) => state.addToast);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
  const selectedSource = collection.sources.find((source) => source.id === selectedSourceId) || null;
  const deleteTarget = collection.sources.find((source) => source.id === deleteSourceId) || null;
  const showDetails = (source: SourceRecordDetail) => setSelectedSourceId(source.id);
  const actions = useSourceActions(showDetails);

  const filteredSources = useMemo(() => collection.sources.filter((source) => (
    sourceMatchesQuery(source, query)
    && (typeFilter === 'all' || source.file.format === typeFilter)
    && (stateFilter === 'all' || deriveSourceExperienceState(source) === stateFilter)
  )), [collection.sources, query, stateFilter, typeFilter]);

  const retry = async (source: SourceRecordDetail) => {
    await collection.retry(source.id);
  };

  const confirmDelete = async (source: SourceRecordDetail) => {
    await deleteSource(source.id);
    setDeleteSourceId(null);
    setSelectedSourceId(null);
    await collection.refresh(true);
    addToast('success', 'Source permanently deleted; historical receipts were retained');
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Source Library</h1>
          <p>{collection.sources.length} sources across all project placements</p>
        </div>
        <SourceUploader
          compact
          uploading={collection.uploading}
          progress={collection.uploadProgress}
          onFile={collection.intake}
        />
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources"
            aria-label="Search sources"
          />
        </label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} aria-label="Filter by type">
          <option value="all">All types</option>
          {['pdf', 'docx', 'txt', 'md', 'png', 'jpeg', 'webp', 'pptx', 'xlsx', 'csv'].map((format) => (
            <option key={format} value={format}>{format.toUpperCase()}</option>
          ))}
        </select>
        <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)} aria-label="Filter by status">
          <option value="all">All states</option>
          <option value="received">Received</option>
          <option value="parsing">Parsing</option>
          <option value="publishing">Publishing</option>
          <option value="materialized">Ready</option>
          <option value="stored_only">Original only</option>
          <option value="failed">Failed</option>
          <option value="projection_missing">Projection missing</option>
          <option value="original_missing">Original missing</option>
        </select>
        <button
          type="button"
          className={styles.iconAction}
          onClick={() => void collection.refresh()}
          title="Refresh sources"
          aria-label="Refresh sources"
        >
          <RefreshCw size={15} className={collection.hasActiveMaterialization ? styles.spinning : undefined} />
        </button>
      </div>

      {collection.error && <div className={styles.errorBanner}>{collection.error}</div>}
      <SourceList
        sources={filteredSources}
        loading={collection.loading}
        emptyMessage={collection.sources.length === 0 ? 'Add the first source to this library' : 'No sources match these filters'}
        onOpen={actions.open}
        onDetails={showDetails}
        onOriginal={(source) => void actions.original(source)}
        onDownload={(source) => void actions.download(source)}
        onRetry={(source) => void retry(source)}
      />
      <SourceDetailDialog
        source={selectedSource}
        onClose={() => setSelectedSourceId(null)}
        onOpen={actions.open}
        onOriginal={(source) => void actions.original(source)}
        onDownload={(source) => void actions.download(source)}
        onRetry={(source) => void retry(source)}
        onDelete={(source) => setDeleteSourceId(source.id)}
      />
      {deleteTarget && (
        <SourceDeleteDialog
          source={deleteTarget}
          onCancel={() => setDeleteSourceId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </main>
  );
}
