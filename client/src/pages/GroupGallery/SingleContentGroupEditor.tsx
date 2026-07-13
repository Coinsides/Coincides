import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Save,
  Trash2,
} from 'lucide-react';
import {
  acceptContentGroupIdentity,
  addMembersToContentGroup,
  archiveContentGroupIdentity,
  createContentGroupMembersFromDragPayload,
  rejectContentGroupIdentity,
  removeContentGroupMember,
  summarizeContentGroupStability,
} from '@/pages/Notes/canvasEngine/contentGroupService';
import {
  readContentGroupDragPayload,
} from '@/pages/Notes/canvasEngine/contentGroupDragService';
import {
  CONTENT_GROUP_SURFACE_ROLES,
} from '@/pages/Notes/canvasEngine/contentGroupSurfaceRoleService';
import {
  purposeRoleForContentGroup,
  upsertDefaultPurposeRoleForContentGroup,
} from '@/pages/Notes/canvasEngine/purposeService';
import type {
  ContentGroupV1,
} from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import styles from './GroupGallery.module.css';
import {
  loadGroupGalleryRecords,
  memberLabel,
  memberPreview,
  replaceRecord,
  saveGalleryRecord,
  type GalleryRecord,
} from './groupGalleryData';
import {
  applyContentGroupEditorDraft,
  type ContentGroupEditorDraft,
} from './singleContentGroupEditorService';
import {
  buildSingleEditorMemberRows,
  buildSingleEditorShellView,
  singleEditorGroupFolderId,
} from './singleContentGroupEditorShellModel';

const editorSurfaceRole = CONTENT_GROUP_SURFACE_ROLES.editor;

export default function SingleContentGroupEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get('note_id');
  const groupId = searchParams.get('group_id');
  const [records, setRecords] = useState<GalleryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [purposeRoleDraft, setPurposeRoleDraft] = useState('');
  const [draft, setDraft] = useState<ContentGroupEditorDraft>({
    title: '',
    topic: '',
    type: '',
    summary: '',
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await loadGroupGalleryRecords());
    } catch (err) {
      console.error('Failed to load content group editor:', err);
      setError('Failed to load content group.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const selected = useMemo(() => {
    if (!noteId || !groupId) return null;
    const record = records.find((item) => item.note.id === noteId);
    const group = record?.groups.find((item) => item.id === groupId && item.status !== 'deleted') || null;
    return record && group ? { record, group } : null;
  }, [groupId, noteId, records]);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      title: selected.group.title,
      topic: selected.group.identity.topic || '',
      type: selected.group.identity.type || selected.group.identity.role || '',
      summary: selected.group.identity.summary || '',
    });
    setPurposeRoleDraft(purposeRoleForContentGroup(selected.record.purposes, selected.group.id) || '');
  }, [selected?.group.id]);

  const persistGroup = useCallback(async (record: GalleryRecord, nextGroup: ContentGroupV1) => {
    const nextRecord = await saveGalleryRecord(
      record,
      record.groups.map((group) => group.id === nextGroup.id ? nextGroup : group),
      record.folders,
    );
    setRecords((current) => replaceRecord(current, nextRecord));
    return nextRecord;
  }, []);

  const handleSaveDraft = async () => {
    if (!selected) return;
    const nextGroup = applyContentGroupEditorDraft({ group: selected.group, draft });
    const savedRecord = await persistGroup(selected.record, nextGroup);
    const nextPurposes = upsertDefaultPurposeRoleForContentGroup({
      purposes: savedRecord.purposes,
      groupId: selected.group.id,
      role: purposeRoleDraft,
    });
    const nextRecord = await saveGalleryRecord(
      savedRecord,
      savedRecord.groups,
      savedRecord.folders,
      nextPurposes,
    );
    setRecords((current) => replaceRecord(current, nextRecord));
  };

  const membersFromDragEvent = (event: DragEvent<HTMLElement>) => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    return payload ? createContentGroupMembersFromDragPayload(payload) : [];
  };

  const handleMemberDragOver = (event: DragEvent<HTMLElement>) => {
    if (membersFromDragEvent(event).length === 0) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnMembers = async (event: DragEvent<HTMLElement>) => {
    if (!selected) return;
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    await persistGroup(selected.record, addMembersToContentGroup(selected.group, members));
  };

  const goBackToGallery = () => {
    if (!selected) {
      navigate('/group-gallery');
      return;
    }
    const params = new URLSearchParams({ note_id: selected.record.note.id });
    const folderId = singleEditorGroupFolderId(selected.group);
    if (folderId) params.set('folder_id', folderId);
    navigate(`/group-gallery?${params.toString()}`);
  };

  const selectedFolder = selected
    ? selected.record.folders.find((folder) => folder.id === singleEditorGroupFolderId(selected.group)) || null
    : null;
  const shellView = selected
    ? buildSingleEditorShellView({
      group: selected.group,
      note: selected.record.note,
      folders: selected.record.folders,
      folder: selectedFolder,
    })
    : null;
  const memberRowById = new Map(
    (selected ? buildSingleEditorMemberRows(selected.group) : []).map((row) => [row.id, row]),
  );
  const selectedStability = selected
    ? summarizeContentGroupStability({ group: selected.group, folder: selectedFolder })
    : null;

  return (
    <div
      className={styles.editorPage}
      data-content-group-surface={editorSurfaceRole.surface}
      data-content-group-role={editorSurfaceRole.verb}
    >
      <header className={styles.singleEditorTopbar}>
        <button className={styles.backButton} type="button" onClick={goBackToGallery}>
          <ArrowLeft size={16} />
          Gallery
        </button>
        <div className={styles.singleEditorTitleCluster}>
          <span className={styles.eyebrow}>{editorSurfaceRole.title} / {editorSurfaceRole.label}</span>
          <input
            className={styles.singleEditorTitleInput}
            value={draft.title}
            disabled={!selected}
            aria-label="Content group title"
            onChange={(event) => setDraft((current) => ({ ...current, title: event.currentTarget.value }))}
            placeholder="Content group"
          />
          {selected ? (
            <div className={styles.singleEditorMetaRow}>
              <span>{selected.record.project.name}</span>
              <span>{shellView?.sourceNoteTitle}</span>
              <span>{shellView?.folderPath}</span>
            </div>
          ) : null}
        </div>
        {selected ? (
          <div className={styles.singleEditorTopActions}>
            <span
              className={styles.singleEditorStatusChip}
              data-status-kind={shellView?.statusKind}
              title={shellView?.stabilityReason}
            >
              {shellView?.statusLabel}
            </span>
            <input
              className={styles.singleEditorChipInput}
              value={draft.type}
              aria-label="Content group type"
              onChange={(event) => setDraft((current) => ({ ...current, type: event.currentTarget.value }))}
              placeholder="type"
            />
            <input
              className={styles.singleEditorChipInput}
              value={purposeRoleDraft}
              aria-label="Default purpose role"
              onChange={(event) => setPurposeRoleDraft(event.currentTarget.value)}
              placeholder="purpose role"
            />
            <input
              className={styles.singleEditorChipInput}
              value={draft.topic}
              aria-label="Content group topic"
              onChange={(event) => setDraft((current) => ({ ...current, topic: event.currentTarget.value }))}
              placeholder="topic"
            />
            <div className={styles.singleEditorInfoWrap}>
              <button
                className={styles.iconTextButton}
                type="button"
                aria-label="Show group facts"
                aria-expanded={infoOpen}
                onClick={() => setInfoOpen((value) => !value)}
              >
                <Info size={14} />
              </button>
              {infoOpen ? (
                <div className={styles.singleEditorInfoPopover} role="dialog" aria-label="Content group facts">
                  <div><span>Members</span><strong>{shellView?.memberCountLabel}</strong></div>
                  <div><span>State</span><strong>{shellView?.stabilityLabel}</strong></div>
                  <div><span>Folder</span><strong>{shellView?.folderPath}</strong></div>
                </div>
              ) : null}
            </div>
            <button className={styles.primaryButton} type="button" onClick={() => void handleSaveDraft()}>
              <Save size={14} />
              Save draft
            </button>
            <Link className={styles.toolbarButton} to={`/notes/${selected.record.note.id}`}>
              <ExternalLink size={15} />
              Open note
            </Link>
          </div>
        ) : null}
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.empty}>Loading content group...</div> : null}
      {!loading && !selected ? <div className={styles.empty}>This content group could not be found.</div> : null}

      {selected ? (
        <>
          <section className={styles.singleEditorSummaryBar}>
            <button
              className={styles.singleEditorSummaryToggle}
              type="button"
              aria-expanded={summaryOpen}
              onClick={() => setSummaryOpen((value) => !value)}
            >
              <span>Summary</span>
              <strong>{draft.summary || shellView?.summaryPreview}</strong>
              <small>{summaryOpen ? 'Collapse' : 'Expand'}</small>
            </button>
            {summaryOpen ? (
              <textarea
                className={styles.singleEditorSummaryEditor}
                value={draft.summary}
                onChange={(event) => setDraft((current) => ({ ...current, summary: event.currentTarget.value }))}
                rows={3}
                aria-label="Content group summary"
              />
            ) : null}
          </section>

          <main className={styles.singleEditorShell} data-editor-stage="refine-shell">
            <section className={styles.singleEditorIdentityPanel}>
              <div className={styles.identityHeader}>
                <div>
                  <span className={styles.eyebrow}>Identity</span>
                  <strong title={selectedStability?.reason}>
                    {shellView?.statusLabel} / {shellView?.stabilityLabel || 'Ready'}
                  </strong>
                </div>
                <div className={styles.identityActions}>
                  <button
                    type="button"
                    onClick={() => void persistGroup(selected.record, acceptContentGroupIdentity(selected.group))}
                    disabled={!shellView?.canAccept}
                    title={shellView?.acceptReason || 'Accept identity'}
                  >
                    <Check size={14} />
                    Accept
                  </button>
                  <button type="button" onClick={() => void persistGroup(selected.record, rejectContentGroupIdentity(selected.group))}>
                    Reject
                  </button>
                  <button type="button" onClick={() => void persistGroup(selected.record, archiveContentGroupIdentity(selected.group))}>
                    <Archive size={14} />
                    Archive
                  </button>
                </div>
              </div>
              <div className={styles.singleEditorStateGrid}>
                <span>{shellView?.memberCountLabel}</span>
                <span>{shellView?.sourceNoteTitle}</span>
                <span>{shellView?.folderPath}</span>
              </div>
            </section>

            <section className={styles.singleEditorMaterialShelf}>
              <div className={styles.boardHeader}>
                <div>
                  <span className={styles.eyebrow}>Members</span>
                  <strong>{shellView?.memberCountLabel}</strong>
                </div>
              </div>
              <div
                className={styles.singleEditorMaterialDropzone}
                onDragOver={handleMemberDragOver}
                onDrop={(event) => void handleDropOnMembers(event)}
              >
                {selected.group.members.length === 0 ? (
                  <p className={styles.muted}>No members yet.</p>
                ) : selected.group.members.map((member) => {
                  const row = memberRowById.get(member.id);
                  return (
                    <article key={member.id} className={styles.memberTile}>
                      <div className={styles.memberTileHeader}>
                        <span>{row?.label || memberLabel(member)}</span>
                        <small>{row?.sourceStatusLabel || member.kind}</small>
                      </div>
                      <p>{row?.preview || memberPreview(member)}</p>
                      <button
                        type="button"
                        onClick={() => void persistGroup(
                          selected.record,
                          removeContentGroupMember(selected.group, member.id),
                        )}
                        aria-label="Remove member"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className={styles.singleEditorContextPanel}>
              <div className={styles.boardHeader}>
                <div>
                  <span className={styles.eyebrow}>Group facts</span>
                  <strong>{shellView?.title}</strong>
                </div>
              </div>
              <dl className={styles.singleEditorFactsList}>
                <div><dt>Topic</dt><dd>{shellView?.topicLabel}</dd></div>
                <div><dt>Type</dt><dd>{shellView?.typeLabel}</dd></div>
                <div><dt>Purpose</dt><dd>{purposeRoleDraft || 'No role'}</dd></div>
                <div><dt>State</dt><dd>{shellView?.stabilityLabel}</dd></div>
                <div><dt>Source</dt><dd>{shellView?.sourceNoteTitle}</dd></div>
              </dl>
            </aside>

            <section className={styles.singleEditorSourceDrawer}>
              <div>
                <span className={styles.eyebrow}>Source</span>
                <strong>{shellView?.sourceNoteTitle}</strong>
              </div>
              <p>{shellView?.summaryPreview}</p>
              <div className={styles.singleEditorSourceFacts}>
                <span>{shellView?.folderPath}</span>
                <span>{shellView?.stabilityLabel}</span>
                <span>{shellView?.typeLabel}</span>
                <span>{shellView?.topicLabel}</span>
              </div>
              <Link to={`/notes/${selected.record.note.id}`}>
                Return to source
                <ChevronRight size={14} />
              </Link>
            </section>
          </main>
        </>
      ) : null}
    </div>
  );
}
