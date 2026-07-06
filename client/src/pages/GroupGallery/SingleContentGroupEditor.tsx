import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Archive,
  Check,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Info,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  acceptContentGroupIdentity,
  addMemberFragmentToPetal,
  addMembersToContentGroup,
  addPetalToContentGroup,
  archiveContentGroupIdentity,
  createContentGroupMembersFromDragPayload,
  moveContentGroupPetal,
  rejectContentGroupIdentity,
  removeContentGroupMember,
  removeContentGroupPetalFragment,
  removeContentGroupPetalMember,
  renameContentGroupPetal,
  softDeleteContentGroupPetal,
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
  AnnotationRangeV1,
  ContentGroupFragmentV1,
  ContentGroupMemberV1,
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
const PETAL_DRAG_MIME = 'application/x-coincides-petal-id';

interface AssignablePiece {
  id: string;
  label: string;
  preview: string | null;
  contentRange: AnnotationRangeV1 | null;
}

function isAnnotationRange(value: unknown): value is AnnotationRangeV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AnnotationRangeV1>;
  return typeof candidate.target_kind === 'string'
    && Boolean(
      candidate.block_id
      || candidate.text_flow_id
      || candidate.canvas_object_id
      || candidate.source_region_id,
    );
}

function sourceRangesFromMember(member: ContentGroupMemberV1): AnnotationRangeV1[] {
  const sourceRanges = member.metadata?.source_ranges;
  if (Array.isArray(sourceRanges)) {
    return sourceRanges.filter(isAnnotationRange).map((range) => ({ ...range }));
  }
  return member.content_range ? [{ ...member.content_range }] : [];
}

function assignablePiecesForMember(member: ContentGroupMemberV1): AssignablePiece[] {
  const ranges = sourceRangesFromMember(member);
  if (ranges.length > 0) {
    return ranges.map((range, index) => ({
      id: range.id || `${member.id}-range-${index}`,
      label: range.target_kind === 'text_span' ? 'Text range' : range.target_kind,
      preview: range.range_text_cache || member.preview_text || null,
      contentRange: range,
    }));
  }

  return [{
    id: `${member.id}-whole`,
    label: memberLabel(member),
    preview: memberPreview(member),
    contentRange: member.content_range || null,
  }];
}

function fragmentById(group: ContentGroupV1, fragmentId: string): ContentGroupFragmentV1 | null {
  return group.fragments?.find((fragment) => fragment.id === fragmentId && fragment.status !== 'deleted') || null;
}

function sourceMemberForFragment(group: ContentGroupV1, fragment: ContentGroupFragmentV1): ContentGroupMemberV1 | null {
  return group.members.find((member) => member.id === fragment.source_member_id) || null;
}

function assignedPetalCount(group: ContentGroupV1, memberId: string): number {
  const fragmentIds = new Set((group.fragments || [])
    .filter((fragment) => fragment.source_member_id === memberId)
    .map((fragment) => fragment.id));
  if (fragmentIds.size === 0) return 0;
  return group.petals
    .filter((petal) => petal.status !== 'deleted')
    .filter((petal) => (petal.fragment_ids || []).some((fragmentId) => fragmentIds.has(fragmentId)))
    .length;
}

export default function SingleContentGroupEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get('note_id');
  const groupId = searchParams.get('group_id');
  const [records, setRecords] = useState<GalleryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentGroupEditorDraft>({
    title: '',
    topic: '',
    type: '',
    summary: '',
  });
  const [purposeRoleDraft, setPurposeRoleDraft] = useState('');
  const [petalLabelDrafts, setPetalLabelDrafts] = useState<Record<string, string>>({});
  const [draggingPetalId, setDraggingPetalId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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
    setPetalLabelDrafts(Object.fromEntries(
      selected.group.petals.map((petal) => [petal.id, petal.label]),
    ));
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

  const persistPurposes = useCallback(async (record: GalleryRecord, nextPurposes: GalleryRecord['purposes']) => {
    const nextRecord = await saveGalleryRecord(
      record,
      record.groups,
      record.folders,
      nextPurposes,
    );
    setRecords((current) => replaceRecord(current, nextRecord));
  }, []);

  const handleSaveDraft = async () => {
    if (!selected) return;
    const nextGroup = applyContentGroupEditorDraft({
      group: selected.group,
      draft,
      petalLabelDrafts,
    });
    const savedRecord = await persistGroup(selected.record, nextGroup);
    const nextPurposes = upsertDefaultPurposeRoleForContentGroup({
      purposes: savedRecord.purposes,
      groupId: selected.group.id,
      role: purposeRoleDraft,
    });
    await persistPurposes(savedRecord, nextPurposes);
  };

  const membersFromDragEvent = (event: DragEvent<HTMLElement>) => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    return payload ? createContentGroupMembersFromDragPayload(payload) : [];
  };

  const handleMemberDragOver = (event: DragEvent<HTMLElement>) => {
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
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

  const handleAssignPieceToPetal = async (
    member: ContentGroupMemberV1,
    piece: AssignablePiece,
    petalId: string,
  ) => {
    if (!selected) return;
    await persistGroup(selected.record, addMemberFragmentToPetal({
      group: selected.group,
      petalId,
      memberId: member.id,
      contentRange: piece.contentRange,
      label: piece.label,
      previewText: piece.preview,
    }));
  };

  const handlePetalDragStart = (event: DragEvent<HTMLButtonElement>, petalId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(PETAL_DRAG_MIME, petalId);
    setDraggingPetalId(petalId);
  };

  const handlePetalDragOver = (event: DragEvent<HTMLElement>) => {
    const isPetalMove = draggingPetalId || Array.from(event.dataTransfer.types).includes(PETAL_DRAG_MIME);
    if (!isPetalMove) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnPetal = async (event: DragEvent<HTMLElement>, targetPetalId: string) => {
    if (!selected) return;
    const petalId = event.dataTransfer.getData(PETAL_DRAG_MIME) || draggingPetalId;
    if (!petalId || petalId === targetPetalId) return;
    event.preventDefault();
    event.stopPropagation();
    await persistGroup(selected.record, moveContentGroupPetal({
      group: selected.group,
      petalId,
      targetPetalId,
    }));
    setDraggingPetalId(null);
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

  const activePetals = selected?.group.petals.filter((petal) => petal.status !== 'deleted') || [];
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
  const memberShellRows = selected ? buildSingleEditorMemberRows(selected.group) : [];
  const memberShellRowById = new Map(memberShellRows.map((row) => [row.id, row]));
  const selectedStability = selected
    ? summarizeContentGroupStability({
      group: selected.group,
      folder: selectedFolder,
    })
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
          <span className={styles.eyebrow}>{editorSurfaceRole.title} · {editorSurfaceRole.label}</span>
          <input
            className={styles.singleEditorTitleInput}
            value={draft.title}
            disabled={!selected}
            aria-label="Content group title"
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, title: value }));
            }}
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
              onChange={(event) => {
                const { value } = event.currentTarget;
                setDraft((current) => ({ ...current, type: value }));
              }}
              placeholder="type"
            />
            <input
              className={styles.singleEditorChipInput}
              value={purposeRoleDraft}
              aria-label="Default purpose role"
              onChange={(event) => {
                setPurposeRoleDraft(event.currentTarget.value);
              }}
              placeholder="purpose role"
            />
            <input
              className={styles.singleEditorChipInput}
              value={draft.topic}
              aria-label="Content group topic"
              onChange={(event) => {
                const { value } = event.currentTarget;
                setDraft((current) => ({ ...current, topic: value }));
              }}
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
                  <div><span>Petals</span><strong>{shellView?.petalCountLabel}</strong></div>
                  <div><span>State</span><strong>{shellView?.stabilityLabel}</strong></div>
                </div>
              ) : null}
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void handleSaveDraft()}
              title="Save group identity and current Petal label edits"
            >
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

      {!loading && !selected ? (
        <div className={styles.empty}>This content group could not be found.</div>
      ) : null}

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
              onChange={(event) => {
                const { value } = event.currentTarget;
                setDraft((current) => ({ ...current, summary: value }));
              }}
              rows={3}
              aria-label="Content group summary"
            />
          ) : null}
        </section>
        <main className={styles.singleEditorShell} data-editor-stage="refine-shell">
          <section className={styles.singleEditorIdentityPanel}>
            <div className={styles.identityHeader}>
              <div>
                <span className={styles.eyebrow}>Refine state</span>
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
              <span>{shellView?.petalCountLabel}</span>
              <span>{shellView?.sourceNoteTitle}</span>
              <span>{shellView?.folderPath}</span>
            </div>
          </section>

          <section className={styles.singleEditorMaterialShelf}>
            <div className={styles.boardHeader}>
              <div>
                <span className={styles.eyebrow}>Materials</span>
                <strong>{shellView?.memberCountLabel} source packages</strong>
              </div>
              <button type="button" disabled title="Preview refresh needs source context. Planned for 8.6.30.">
                <RefreshCcw size={14} />
                Refresh preview
              </button>
            </div>
            <div
              className={styles.singleEditorMaterialDropzone}
              onDragOver={handleMemberDragOver}
              onDrop={(event) => void handleDropOnMembers(event)}
            >
              {selected.group.members.length === 0 ? (
                <p className={styles.muted}>No members yet. Add ranges, labels, or blocks from the note rail.</p>
              ) : selected.group.members.map((member) => {
                const pieces = assignablePiecesForMember(member);
                const assignedCount = assignedPetalCount(selected.group, member.id);
                const memberRow = memberShellRowById.get(member.id);
                return (
                <article key={member.id} className={styles.memberTile}>
                  <div className={styles.memberTileHeader}>
                    <span>{memberRow?.label || memberLabel(member)}</span>
                    <small>{memberRow?.sourceStatusLabel || member.kind} / {assignedCount} petals</small>
                  </div>
                  <p>{memberRow?.preview || memberPreview(member)}</p>
                  <button
                    type="button"
                    onClick={() => void persistGroup(
                      selected.record,
                      removeContentGroupMember(selected.group, member.id),
                    )}
                    aria-label="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className={styles.memberPieceList}>
                    {pieces.map((piece) => (
                      <div key={piece.id} className={styles.memberPiece}>
                        <div>
                          <span>{piece.label}</span>
                          <p>{piece.preview || 'No preview'}</p>
                        </div>
                        <div className={styles.pieceActions}>
                          {activePetals.length === 0 ? (
                            <small>Create a petal first.</small>
                          ) : activePetals.map((petal) => (
                            <button
                              key={petal.id}
                              type="button"
                              onClick={() => void handleAssignPieceToPetal(member, piece, petal.id)}
                            >
                              <Plus size={12} />
                              {petal.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
                );
              })}
            </div>
          </section>

          <aside className={styles.singleEditorPetalDock}>
            <div className={styles.boardHeader}>
              <div>
                <span className={styles.eyebrow}>Petals</span>
                <strong>Local roles</strong>
              </div>
              <button
                type="button"
                onClick={() => void persistGroup(selected.record, addPetalToContentGroup(selected.group, 'New petal'))}
              >
                <Plus size={14} />
                New petal
              </button>
            </div>
            <div className={styles.petalList}>
              {activePetals.length === 0 ? (
                <p className={styles.muted}>No petals yet. Split the group into concept name, description, example, result, or your own local roles.</p>
              ) : activePetals.map((petal) => {
                const petalDraftLabel = petalLabelDrafts[petal.id] ?? petal.label;
                const fragments = (petal.fragment_ids || [])
                  .map((fragmentId) => fragmentById(selected.group, fragmentId))
                  .filter((fragment): fragment is ContentGroupFragmentV1 => Boolean(fragment));
                return (
                  <section
                    key={petal.id}
                    className={`${styles.petalTile} ${draggingPetalId === petal.id ? styles.petalTileDragging : ''}`}
                    onDragOver={handlePetalDragOver}
                    onDrop={(event) => void handleDropOnPetal(event, petal.id)}
                  >
                    <div className={styles.petalHeader}>
                      <input
                        value={petalDraftLabel}
                        onChange={(event) => {
                          const { value } = event.currentTarget;
                          setPetalLabelDrafts((current) => ({
                            ...current,
                            [petal.id]: value,
                          }));
                        }}
                        onBlur={(event) => void persistGroup(selected.record, renameContentGroupPetal({
                          group: selected.group,
                          petalId: petal.id,
                          label: event.currentTarget.value,
                        }))}
                      />
                      <button
                        type="button"
                        className={styles.petalDragHandle}
                        draggable
                        onDragStart={(event) => handlePetalDragStart(event, petal.id)}
                        onDragEnd={() => setDraggingPetalId(null)}
                        aria-label="Move petal"
                      >
                        <GripVertical size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPetalLabelDrafts((current) => {
                            const next = { ...current };
                            delete next[petal.id];
                            return next;
                          });
                          void persistGroup(selected.record, softDeleteContentGroupPetal({
                            group: selected.group,
                            petalId: petal.id,
                          }));
                        }}
                        aria-label="Delete petal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {fragments.length === 0 && petal.members.length === 0 ? (
                      <p className={styles.muted}>Empty petal.</p>
                    ) : null}
                    {fragments.map((fragment) => {
                      const sourceMember = sourceMemberForFragment(selected.group, fragment);
                      return (
                        <div key={fragment.id} className={styles.petalMember}>
                          <span>{fragment.label || 'Fragment'}</span>
                          <p>{fragment.preview_text || sourceMember?.preview_text || 'No preview'}</p>
                          <small>{sourceMember ? `From ${memberLabel(sourceMember)}` : 'Source member missing'}</small>
                          <button
                            type="button"
                            onClick={() => void persistGroup(selected.record, removeContentGroupPetalFragment({
                              group: selected.group,
                              petalId: petal.id,
                              fragmentId: fragment.id,
                            }))}
                            aria-label="Remove petal fragment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                    {petal.members.map((member) => (
                      <div key={member.id} className={styles.petalMember}>
                        <span>{memberLabel(member)}</span>
                        <p>{memberPreview(member)}</p>
                        <small>Legacy member reference</small>
                        <button
                          type="button"
                          onClick={() => void persistGroup(selected.record, removeContentGroupPetalMember({
                            group: selected.group,
                            petalId: petal.id,
                            memberId: member.id,
                          }))}
                          aria-label="Remove petal member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          </aside>

          <section className={styles.singleEditorSourceDrawer}>
            <div>
              <span className={styles.eyebrow}>Source drawer</span>
              <strong>{shellView?.sourceNoteTitle}</strong>
            </div>
            <p>
              Members remain group-local material linked back to source. This editor refines the package without moving or rewriting the original note.
            </p>
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
