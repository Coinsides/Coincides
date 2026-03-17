import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  File,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import type { Document } from '@shared/types';
import styles from './DocumentManager.module.css';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return <FileText size={16} className={styles.iconPdf} />;
    case 'docx':
      return <FileText size={16} className={styles.iconDocx} />;
    case 'xlsx':
      return <FileSpreadsheet size={16} className={styles.iconXlsx} />;
    case 'image':
      return <Image size={16} className={styles.iconImage} />;
    default:
      return <File size={16} className={styles.iconTxt} />;
  }
}

function getStatusBadge(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pending',
    parsing: 'Parsing',
    completed: 'Completed',
    failed: 'Failed',
  };
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
      {status === 'parsing' && <Loader2 size={10} className={styles.spinning} />}
      {labels[status] || status}
    </span>
  );
}

function getDocTypeBadge(docType: string | null) {
  if (!docType) return null;
  const labels: Record<string, string> = {
    textbook: 'Textbook',
    notes: 'Notes',
    slides: 'Slides',
    problem_set: 'Problem Set',
    reference: 'Reference',
    other: 'Other',
  };
  return <span className={styles.docTypeBadge}>{labels[docType] || docType}</span>;
}

export default function DocumentManager() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const documents = useDocumentStore((s) => s.documents);
  const loading = useDocumentStore((s) => s.loading);
  const uploading = useDocumentStore((s) => s.uploading);
  const uploadProgress = useDocumentStore((s) => s.uploadProgress);
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);
  const uploadDocument = useDocumentStore((s) => s.uploadDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const pollStatus = useDocumentStore((s) => s.pollStatus);
  const getDocumentDetail = useDocumentStore((s) => s.getDocumentDetail);
  const retryParse = useDocumentStore((s) => s.retryParse);

  const courseId = modal?.data?.courseId as string;
  const courseName = modal?.data?.courseName as string;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pollingRef = useRef(false);

  // Fetch documents on mount
  useEffect(() => {
    if (courseId) {
      fetchDocuments(courseId);
    }
  }, [courseId, fetchDocuments]);

  // Poll parsing documents every 3s
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const docs = useDocumentStore.getState().documents;
      const parsingDocs = docs.filter(
        (d) => d.parse_status === 'pending' || d.parse_status === 'parsing'
      );

      if (parsingDocs.length === 0) {
        pollingRef.current = false;
        return;
      }

      pollingRef.current = true;

      for (const d of parsingDocs) {
        if (cancelled) return;
        await pollStatus(d.id);
      }

      if (!cancelled) {
        setTimeout(poll, 3000);
      }
    };

    // Start polling when documents change and there are parsing docs
    const parsingDocs = documents.filter(
      (d) => d.parse_status === 'pending' || d.parse_status === 'parsing'
    );
    if (parsingDocs.length > 0 && !pollingRef.current) {
      poll();
    }

    return () => { cancelled = true; };
  }, [documents, pollStatus]);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        try {
          await uploadDocument(courseId, file);
          addToast('success', `Uploaded ${file.name}`);
        } catch {
          addToast('error', `Failed to upload ${file.name}`);
        }
      }
    },
    [courseId, uploadDocument, addToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      addToast('success', 'Document deleted');
      setConfirmDeleteId(null);
    } catch {
      addToast('error', 'Failed to delete document');
    }
  };

  const handleExpand = async (doc: Document) => {
    if (expandedId === doc.id) {
      setExpandedId(null);
      return;
    }
    // Fetch full details if needed
    if (doc.parse_status === 'completed' && !doc.summary) {
      try {
        await getDocumentDetail(doc.id);
      } catch {
        // Continue with what we have
      }
    }
    setExpandedId(doc.id);
  };

  const ACCEPTED = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.txt,.md';

  return (
    <div className={styles.overlay} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>Files — {courseName}</div>
          <button className={styles.closeBtn} onClick={closeModal}>
            <X size={16} />
          </button>
        </div>

        {/* Upload area */}
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 size={24} className={styles.spinning} />
          ) : (
            <Upload size={24} />
          )}
          <span>{uploading ? `Uploading... ${uploadProgress ?? ''}%` : 'Drop files here or click to browse'}</span>
          <span className={styles.dropzoneHint}>
            PDF, DOCX, XLSX, Images, TXT, MD — up to 50MB
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className={styles.hiddenInput}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {/* Document list */}
        <div className={styles.docList}>
          {loading && documents.length === 0 && (
            <div className={styles.emptyState}>Loading...</div>
          )}
          {!loading && documents.length === 0 && (
            <div className={styles.emptyState}>No files uploaded yet</div>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className={styles.docItem}>
              <div
                className={styles.docRow}
                onClick={() => doc.parse_status === 'completed' && handleExpand(doc)}
              >
                <div className={styles.docIcon}>{getFileIcon(doc.file_type)}</div>
                <div className={styles.docInfo}>
                  <div className={styles.docName}>{doc.filename}</div>
                  <div className={styles.docMeta}>
                    {formatFileSize(doc.file_size)}
                    {doc.page_count && ` · ${doc.page_count} pages`}
                  </div>
                </div>
                <div className={styles.docBadges}>
                  {getStatusBadge(doc.parse_status)}
                  {doc.parse_status === 'completed' && getDocTypeBadge(doc.document_type)}
                </div>
                <div className={styles.docActions}>
                  {doc.parse_status === 'completed' && (
                    <span className={styles.expandIcon}>
                      {expandedId === doc.id ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </span>
                  )}
                  <button
                    className={styles.deleteIconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(doc.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Error message for failed docs */}
              {doc.parse_status === 'failed' && doc.error_message && (
                <div className={styles.errorMessage}>
                  {doc.error_message}
                  <button
                    className={styles.retryBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      retryParse(doc.id);
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Expanded summary */}
              {expandedId === doc.id && doc.parse_status === 'completed' && (
                <div className={styles.docSummary}>
                  {doc.summary || 'No summary available.'}
                  {doc.chunk_count > 0 && (
                    <div className={styles.chunkInfo}>
                      {doc.chunk_count} chunks
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delete confirmation */}
        {confirmDeleteId && (
          <div className={styles.confirmOverlay} onClick={() => setConfirmDeleteId(null)}>
            <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
              <div className={styles.confirmTitle}>Delete Document</div>
              <div className={styles.confirmText}>
                Are you sure you want to delete this document? This action cannot be undone.
              </div>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancelBtn}
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmDeleteBtn}
                  onClick={() => handleDelete(confirmDeleteId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
