import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Eye, Plus, Save, Trash2, X } from 'lucide-react';
import api from '@/services/api';
import { useUIStore } from '@/stores/uiStore';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import sharedTypes from '@shared/types';
import styles from './NoteDetail.module.css';

const {
  getNoteBlockTemplateLabel,
  legacyBlockTypeForTemplate,
  listNoteBlockTemplates,
  mergeNoteBlockTemplateMetadata,
} = sharedTypes;

const TEMPLATE_OPTIONS = listNoteBlockTemplates();

interface Note {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
}

interface SourceReference {
  id?: string;
  document_id?: string | null;
  source_page_start?: number | null;
  source_page_end?: number | null;
  source_excerpt?: string | null;
  confidence?: number | null;
}

interface SourceAnchor {
  id: string;
  source_snapshot_id: string;
  source_snapshot_page_id: string | null;
  anchor_kind: string;
  page_start: number | null;
  page_end: number | null;
  metadata: {
    note_block_source_id?: string;
    [key: string]: unknown;
  };
}

interface SourceJumpTarget {
  anchor: SourceAnchor;
  snapshot: {
    id: string;
    title: string;
    source_filename: string;
  };
  page: {
    id: string;
    page_number: number;
    page_label: string | null;
    text_content: string;
  };
  focus: {
    page_start: number | null;
    page_end: number | null;
    text_start_offset: number | null;
    text_end_offset: number | null;
  };
  warnings: string[];
}

interface NoteBlock {
  id: string;
  placement_id: string;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  source_references: SourceReference[];
}

function textFromContent(block: NoteBlock): string {
  const body = block.content_json?.body;
  if (typeof body === 'string') return body;
  return block.plain_text || '';
}

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('text.paragraph');
  const [newBlockText, setNewBlockText] = useState('');
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [anchorsBySourceRef, setAnchorsBySourceRef] = useState<Record<string, SourceAnchor>>({});
  const [sourceJumpTarget, setSourceJumpTarget] = useState<SourceJumpTarget | null>(null);
  const [sourceJumpBusy, setSourceJumpBusy] = useState<string | null>(null);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks]
  );

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const [noteRes, blocksRes] = await Promise.all([
        api.get(`/notes/${noteId}`),
        api.get(`/notes/${noteId}/blocks`),
      ]);
      setNote(noteRes.data);
      setTitleDraft(noteRes.data.title);
      setBlocks(blocksRes.data);
    } catch (err) {
      console.error('Failed to load note:', err);
      addToast('error', 'Failed to load note');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const fetchSourceAnchors = useCallback(async (courseId: string) => {
    try {
      await api.post('/source-anchors/generate', {
        course_id: courseId,
        target_type: 'note_block',
      });
      const res = await api.get('/source-anchors', { params: { course_id: courseId } });
      const nextAnchors: Record<string, SourceAnchor> = {};
      for (const anchor of res.data as SourceAnchor[]) {
        const sourceRefId = anchor.metadata?.note_block_source_id;
        if (sourceRefId) nextAnchors[sourceRefId] = anchor;
      }
      setAnchorsBySourceRef(nextAnchors);
    } catch (err) {
      console.error('Failed to load source anchors:', err);
      setAnchorsBySourceRef({});
    }
  }, []);

  useEffect(() => {
    if (!note?.course_id || blocks.length === 0) return;
    fetchSourceAnchors(note.course_id);
  }, [note?.course_id, blocks, fetchSourceAnchors]);

  const saveTitle = async () => {
    if (!note || !titleDraft.trim()) return;
    try {
      const res = await api.put(`/notes/${note.id}`, { title: titleDraft.trim() });
      setNote(res.data);
      addToast('success', 'Note renamed');
    } catch (err) {
      console.error('Failed to rename note:', err);
      addToast('error', 'Failed to rename note');
    }
  };

  const addBlock = async () => {
    if (!note || !newBlockText.trim()) return;
    try {
      const metadata = mergeNoteBlockTemplateMetadata({ template_id: newTemplateId }, legacyBlockTypeForTemplate(newTemplateId));
      await api.post(`/notes/${note.id}/blocks`, {
        block_type: legacyBlockTypeForTemplate(newTemplateId),
        content_json: { body: newBlockText.trim() },
        plain_text: newBlockText.trim(),
        metadata,
      });
      setNewBlockText('');
      await fetchNote();
      addToast('success', 'Block added');
    } catch (err) {
      console.error('Failed to add block:', err);
      addToast('error', 'Failed to add block');
    }
  };

  const saveBlock = async (block: NoteBlock, text: string) => {
    setSavingBlockId(block.id);
    try {
      const res = await api.put(`/note-blocks/${block.id}`, {
        content_json: { ...block.content_json, body: text },
        plain_text: text,
      });
      setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, ...res.data } : item));
      addToast('success', 'Block saved');
    } catch (err) {
      console.error('Failed to save block:', err);
      addToast('error', 'Failed to save block');
    } finally {
      setSavingBlockId(null);
    }
  };

  const trashBlock = async (blockId: string) => {
    try {
      await api.delete(`/note-blocks/${blockId}`);
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      addToast('success', 'Block moved to trash');
    } catch (err) {
      console.error('Failed to trash block:', err);
      addToast('error', 'Failed to trash block');
    }
  };

  const moveBlock = async (placementId: string, direction: -1 | 1) => {
    if (!note) return;
    const current = sortedBlocks.findIndex((block) => block.placement_id === placementId);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= sortedBlocks.length) return;

    const reordered = [...sortedBlocks];
    [reordered[current], reordered[target]] = [reordered[target], reordered[current]];
    const placements = reordered.map((block, index) => ({
      placement_id: block.placement_id,
      order_index: index,
    }));

    try {
      await api.put(`/notes/${note.id}/blocks/reorder`, { placements });
      setBlocks(reordered.map((block, index) => ({ ...block, order_index: index })));
    } catch (err) {
      console.error('Failed to reorder blocks:', err);
      addToast('error', 'Failed to reorder blocks');
    }
  };

  const handleViewSource = async (anchorId: string) => {
    setSourceJumpBusy(anchorId);
    try {
      const res = await api.get(`/source-anchors/${anchorId}/jump-target`);
      setSourceJumpTarget(res.data);
    } catch (err: any) {
      console.error('Failed to open source anchor:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source');
    } finally {
      setSourceJumpBusy(null);
    }
  };

  if (loading || !note) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate(`/courses/${note.course_id}`)}>
        <ArrowLeft size={18} />
        Course
      </button>

      <div className={styles.header}>
        <input
          className={styles.titleInput}
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
        />
        <button className={styles.saveTitleBtn} onClick={saveTitle}>
          <Save size={16} />
          Save title
        </button>
      </div>

      <div className={styles.addBlock}>
        <select
          className={styles.typeSelect}
          value={newTemplateId}
          onChange={(event) => setNewTemplateId(event.target.value)}
        >
          {TEMPLATE_OPTIONS.map((template) => (
            <option key={template.template_id} value={template.template_id}>{template.label}</option>
          ))}
        </select>
        <textarea
          className={styles.newBlockText}
          value={newBlockText}
          onChange={(event) => setNewBlockText(event.target.value)}
          placeholder="Write a new note block. Use $...$ or $$...$$ for formulas."
        />
        <button className={styles.addBlockBtn} onClick={addBlock}>
          <Plus size={16} />
          Add block
        </button>
      </div>

      {sourceJumpTarget && (
        <div className={styles.sourceJumpPanel}>
          <div className={styles.sourceJumpHeader}>
            <div>
              <div className={styles.sourceJumpEyebrow}>Source snapshot</div>
              <div className={styles.sourceJumpTitle}>{sourceJumpTarget.snapshot.title}</div>
              <div className={styles.sourceJumpMeta}>
                {sourceJumpTarget.snapshot.source_filename} 路 {sourceJumpTarget.page.page_label || `p.${sourceJumpTarget.page.page_number}`}
              </div>
            </div>
            <button
              className={styles.iconBtn}
              onClick={() => setSourceJumpTarget(null)}
              title="Close source"
            >
              <X size={16} />
            </button>
          </div>
          <div className={styles.sourceJumpPage}>
            <div className={styles.sourceJumpPageLabel}>
              Focused source page
              {sourceJumpTarget.focus.page_start ? ` ${sourceJumpTarget.focus.page_start}` : ''}
              {sourceJumpTarget.focus.page_end && sourceJumpTarget.focus.page_end !== sourceJumpTarget.focus.page_start ? `-${sourceJumpTarget.focus.page_end}` : ''}
            </div>
            <p>{sourceJumpTarget.page.text_content}</p>
          </div>
        </div>
      )}

      <div className={styles.blockList}>
        {sortedBlocks.length === 0 ? (
          <div className={styles.empty}>No blocks yet</div>
        ) : (
          sortedBlocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              total={sortedBlocks.length}
              saving={savingBlockId === block.id}
              onSave={saveBlock}
              onTrash={() => trashBlock(block.id)}
              onMoveUp={() => moveBlock(block.placement_id, -1)}
              onMoveDown={() => moveBlock(block.placement_id, 1)}
              anchorsBySourceRef={anchorsBySourceRef}
              sourceJumpBusy={sourceJumpBusy}
              onViewSource={handleViewSource}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  index,
  total,
  saving,
  onSave,
  onTrash,
  onMoveUp,
  onMoveDown,
  anchorsBySourceRef,
  sourceJumpBusy,
  onViewSource,
}: {
  block: NoteBlock;
  index: number;
  total: number;
  saving: boolean;
  onSave: (block: NoteBlock, text: string) => void;
  onTrash: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  sourceJumpBusy: string | null;
  onViewSource: (anchorId: string) => void;
}) {
  const [text, setText] = useState(textFromContent(block));

  useEffect(() => {
    setText(textFromContent(block));
  }, [block.id, block.content_json, block.plain_text]);

  return (
    <div className={styles.block}>
      <div className={styles.blockToolbar}>
        <span className={styles.blockType}>{getNoteBlockTemplateLabel(block.metadata, block.block_type)}</span>
        <div className={styles.blockActions}>
          <button className={styles.iconBtn} onClick={onMoveUp} disabled={index === 0} title="Move up">
            <ChevronUp size={16} />
          </button>
          <button className={styles.iconBtn} onClick={onMoveDown} disabled={index === total - 1} title="Move down">
            <ChevronDown size={16} />
          </button>
          <button className={styles.iconBtn} onClick={() => onSave(block, text)} disabled={saving} title="Save block">
            <Save size={16} />
          </button>
          <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={onTrash} title="Move to trash">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <textarea
        className={styles.blockText}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <div className={styles.preview}>
        <KaTeXRenderer text={text} />
      </div>

      {block.source_references?.length > 0 && (
        <div className={styles.sources}>
          {block.source_references.map((source, sourceIndex) => {
            const anchor = source.id ? anchorsBySourceRef[source.id] : undefined;
            return (
              <span key={source.id || sourceIndex} className={styles.sourceRef}>
                <span>
                  Source reference
                  {source.source_page_start ? ` page ${source.source_page_start}` : ''}
                  {source.source_page_end && source.source_page_end !== source.source_page_start ? `-${source.source_page_end}` : ''}
                </span>
                {anchor && (
                  <button
                    type="button"
                    className={styles.sourceRefAction}
                    disabled={sourceJumpBusy === anchor.id}
                    onClick={() => onViewSource(anchor.id)}
                  >
                    <Eye size={13} />
                    View source
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
