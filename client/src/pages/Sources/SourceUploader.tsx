import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import styles from './SourceLibrary.module.css';

const ACCEPTED_SOURCE_TYPES = '.pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.pptx,.xlsx,.csv';

interface SourceUploaderProps {
  uploading: boolean;
  progress: number;
  onFile: (file: File) => Promise<unknown>;
  compact?: boolean;
}

export function SourceUploader({ uploading, progress, onFile, compact = false }: SourceUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const submit = (file: File | undefined) => {
    if (!file || uploading) return;
    void onFile(file).catch(() => undefined);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    submit(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={`${styles.uploader} ${compact ? styles.uploaderCompact : ''} ${dragActive ? styles.uploaderActive : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
      }}
      onDrop={handleDrop}
      data-source-uploader="true"
    >
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={ACCEPTED_SOURCE_TYPES}
        disabled={uploading}
        onChange={(event) => {
          submit(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <button
        type="button"
        className={styles.uploadButton}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload size={15} />
        {uploading ? `Uploading ${progress}%` : 'Add source'}
      </button>
      {!compact && <span>Drop a supported file here</span>}
      {uploading && <div className={styles.uploadProgress}><span style={{ width: `${progress}%` }} /></div>}
    </div>
  );
}
