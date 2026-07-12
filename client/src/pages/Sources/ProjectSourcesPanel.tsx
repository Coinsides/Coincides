import { useState } from 'react';
import { FileText } from 'lucide-react';
import { SourceDetailDialog } from './SourceDetailDialog';
import { SourceList } from './SourceList';
import { SourceUploader } from './SourceUploader';
import type { SourceRecordDetail } from './sourceExperienceModel';
import { useSourceActions } from './useSourceActions';
import { useSourceCollection } from './useSourceCollection';
import styles from './SourceLibrary.module.css';

export interface LegacyProjectDocument {
  id: string;
  filename: string;
  file_type: string;
  parse_status: string;
  page_count: number | null;
  created_at: string;
}

interface ProjectSourcesPanelProps {
  projectId: string;
  legacyDocuments?: LegacyProjectDocument[];
}

export function ProjectSourcesPanel({ projectId, legacyDocuments = [] }: ProjectSourcesPanelProps) {
  const collection = useSourceCollection({
    courseId: projectId,
    originEntryKind: 'project_upload',
  });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const selectedSource = collection.sources.find((source) => source.id === selectedSourceId) || null;
  const showDetails = (source: SourceRecordDetail) => setSelectedSourceId(source.id);
  const actions = useSourceActions(showDetails);

  const retry = async (source: SourceRecordDetail) => {
    await collection.retry(source.id);
  };

  return (
    <section id="project-sources" className={styles.projectPanel}>
      <header className={styles.projectHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Project placement</span>
          <h2>Sources <span>{collection.sources.length}</span></h2>
        </div>
        <SourceUploader
          compact
          uploading={collection.uploading}
          progress={collection.uploadProgress}
          onFile={collection.intake}
        />
      </header>

      {collection.error && <div className={styles.errorBanner}>{collection.error}</div>}
      <SourceList
        sources={collection.sources}
        loading={collection.loading}
        emptyMessage="No sources placed in this Project"
        onOpen={actions.open}
        onDetails={showDetails}
        onOriginal={(source) => void actions.original(source)}
        onDownload={(source) => void actions.download(source)}
        onRetry={(source) => void retry(source)}
      />

      {legacyDocuments.length > 0 && (
        <section className={styles.legacySection}>
          <header>
            <h3>Legacy documents</h3>
            <span>Read-only archive</span>
          </header>
          <div className={styles.legacyList}>
            {legacyDocuments.map((document) => (
              <div key={document.id}>
                <FileText size={14} />
                <strong>{document.filename}</strong>
                <span>{document.file_type.toUpperCase()}</span>
                <span>{document.page_count ? `${document.page_count} pages` : document.parse_status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <SourceDetailDialog
        source={selectedSource}
        onClose={() => setSelectedSourceId(null)}
        onOpen={actions.open}
        onOriginal={(source) => void actions.original(source)}
        onDownload={(source) => void actions.download(source)}
        onRetry={(source) => void retry(source)}
      />
    </section>
  );
}
