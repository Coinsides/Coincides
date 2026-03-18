import { useState, useEffect, KeyboardEvent } from 'react';
import { X, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import type { TagGroup, Tag } from '@shared/types';
import styles from './TagGroupManager.module.css';

const PRESET_COLORS = [
  '#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#8b5cf6', '#64748b',
];

export default function TagGroupManager() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const tagGroups = useTagStore((s) => s.tagGroups);
  const fetchTagGroups = useTagStore((s) => s.fetchTagGroups);
  const createTagGroup = useTagStore((s) => s.createTagGroup);
  const updateTagGroup = useTagStore((s) => s.updateTagGroup);
  const deleteTagGroup = useTagStore((s) => s.deleteTagGroup);
  const createTag = useTagStore((s) => s.createTag);
  const updateTag = useTagStore((s) => s.updateTag);
  const deleteTag = useTagStore((s) => s.deleteTag);

  const courseId = modal?.data?.courseId as string;
  const courseName = modal?.data?.courseName as string;

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [addingTagToGroup, setAddingTagToGroup] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchTagGroups(courseId);
    }
  }, [courseId]);

  // Expand all groups by default when they load
  useEffect(() => {
    setExpandedGroups(new Set(tagGroups.map((g) => g.id)));
  }, [tagGroups.length]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createTagGroup({ course_id: courseId, name: newGroupName.trim() });
      setNewGroupName('');
      setAddingGroup(false);
      addToast('success', 'Tag group created');
    } catch (err) {
      console.error('Failed to create tag group:', err);
      addToast('error', 'Failed to create tag group');
    }
  };

  const handleUpdateGroup = async (id: string) => {
    if (!editingGroupName.trim()) return;
    try {
      await updateTagGroup(id, { name: editingGroupName.trim() });
      setEditingGroupId(null);
      addToast('success', 'Tag group updated');
    } catch (err) {
      console.error('Failed to update tag group:', err);
      addToast('error', 'Failed to update tag group');
    }
  };

  const handleDeleteGroup = async (group: TagGroup) => {
    try {
      await deleteTagGroup(group.id);
      addToast('success', 'Tag group deleted');
    } catch (err) {
      console.error('Failed to delete tag group:', err);
      addToast('error', 'Failed to delete tag group');
    }
  };

  const handleAddTag = async (groupId: string) => {
    if (!newTagName.trim()) return;
    try {
      await createTag({ name: newTagName.trim(), color: newTagColor, tag_group_id: groupId });
      // Refresh tag groups to pick up the new tag
      await fetchTagGroups(courseId);
      setNewTagName('');
      setNewTagColor(PRESET_COLORS[0]);
      setAddingTagToGroup(null);
      addToast('success', 'Tag created');
    } catch (err) {
      console.error('Failed to create tag:', err);
      addToast('error', 'Failed to create tag');
    }
  };

  const handleUpdateTag = async (tag: Tag) => {
    if (!editTagName.trim()) return;
    try {
      await updateTag(tag.id, { name: editTagName.trim(), color: editTagColor });
      await fetchTagGroups(courseId);
      setEditingTagId(null);
      addToast('success', 'Tag updated');
    } catch (err) {
      console.error('Failed to update tag:', err);
      addToast('error', 'Failed to update tag');
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    try {
      await deleteTag(tag.id);
      addToast('success', 'Tag deleted');
    } catch (err) {
      console.error('Failed to delete tag:', err);
      addToast('error', 'Failed to delete tag');
    }
  };

  const handleKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
      setAddingTagToGroup(null);
      setEditingTagId(null);
      setAddingGroup(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Tags — {courseName}</div>
          <button className={styles.closeBtn} onClick={closeModal}>
            <X size={16} />
          </button>
        </div>

        {tagGroups.length === 0 && !addingGroup && (
          <div className={styles.emptyState}>
            No tag groups yet. Create one to organize your tags.
          </div>
        )}

        {tagGroups.map((group) => (
          <div key={group.id} className={styles.groupSection}>
            <div className={styles.groupHeader} onClick={() => toggleExpand(group.id)}>
              <div className={styles.groupNameArea}>
                <ChevronRight
                  size={14}
                  className={`${styles.chevron} ${expandedGroups.has(group.id) ? styles.chevronOpen : ''}`}
                />
                {editingGroupId === group.id ? (
                  <input
                    className={styles.groupNameInput}
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleUpdateGroup(group.id))}
                    onBlur={() => handleUpdateGroup(group.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className={styles.groupName}>{group.name}</span>
                )}
                <span className={styles.tagCount}>({group.tags?.length || 0})</span>
              </div>
              <div className={styles.groupActions}>
                <button
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupId(group.id);
                    setEditingGroupName(group.name);
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {expandedGroups.has(group.id) && (
              <div className={styles.groupBody}>
                {group.tags?.map((tag) => (
                  editingTagId === tag.id ? (
                    <div key={tag.id} className={styles.tagEditRow}>
                      <div
                        className={styles.tagDot}
                        style={{ backgroundColor: editTagColor }}
                      />
                      <input
                        className={styles.tagNameInput}
                        value={editTagName}
                        onChange={(e) => setEditTagName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleUpdateTag(tag))}
                        autoFocus
                      />
                      <div className={styles.saveRow}>
                        <button className={styles.saveBtn} onClick={() => handleUpdateTag(tag)}>Save</button>
                        <button className={styles.cancelSmBtn} onClick={() => setEditingTagId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={tag.id} className={styles.tagRow}>
                      <div
                        className={styles.tagDot}
                        style={{ backgroundColor: tag.color || '#64748b' }}
                      />
                      <span className={styles.tagName}>{tag.name}</span>
                      <div className={styles.tagRowActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditTagName(tag.name);
                            setEditTagColor(tag.color || '#64748b');
                          }}
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDeleteTag(tag)}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )
                ))}

                {/* Edit tag color picker - shown when editing */}
                {editingTagId && group.tags?.some((t) => t.id === editingTagId) && (
                  <div className={styles.colorSwatches}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`${styles.colorSwatch} ${editTagColor === c ? styles.colorSwatchActive : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEditTagColor(c)}
                      />
                    ))}
                  </div>
                )}

                {addingTagToGroup === group.id ? (
                  <div>
                    <div className={styles.tagEditRow}>
                      <div
                        className={styles.tagDot}
                        style={{ backgroundColor: newTagColor }}
                      />
                      <input
                        className={styles.tagNameInput}
                        placeholder="Tag name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleAddTag(group.id))}
                        autoFocus
                      />
                      <div className={styles.saveRow}>
                        <button className={styles.saveBtn} onClick={() => handleAddTag(group.id)}>Add</button>
                        <button className={styles.cancelSmBtn} onClick={() => setAddingTagToGroup(null)}>Cancel</button>
                      </div>
                    </div>
                    <div className={styles.colorSwatches}>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`${styles.colorSwatch} ${newTagColor === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewTagColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.addTagBtn}
                    onClick={() => {
                      setAddingTagToGroup(group.id);
                      setNewTagName('');
                      setNewTagColor(PRESET_COLORS[0]);
                    }}
                  >
                    + Add Tag
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {addingGroup ? (
          <div className={styles.tagEditRow} style={{ marginTop: 8 }}>
            <input
              className={styles.tagNameInput}
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleAddGroup)}
              autoFocus
            />
            <div className={styles.saveRow}>
              <button className={styles.saveBtn} onClick={handleAddGroup}>Create</button>
              <button className={styles.cancelSmBtn} onClick={() => setAddingGroup(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            className={styles.addGroupBtn}
            onClick={() => {
              setAddingGroup(true);
              setNewGroupName('');
            }}
          >
            <Plus size={14} />
            Add Tag Group
          </button>
        )}
      </div>
    </div>
  );
}
