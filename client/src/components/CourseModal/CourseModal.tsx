import { useState, useEffect, FormEvent } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import type { Course } from '@shared/types';
import type { SkinSelection } from '@shared/types/skin';
import { readSkin } from '@/styles/skinPresets';
import { SkinControls } from '@/components/Skin/SkinControls';
import { useAuthStore } from '@/stores/authStore';
import { saveSkinWithPalette } from '@/hooks/usePaletteColors';
import styles from './CourseModal.module.css';

const PRESET_COLORS = [
  '#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#8b5cf6', '#64748b',
];

export default function CourseModal() {
  const globalSkin = useAuthStore((state) => state.user?.settings.skin);
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const { createCourse, updateCourse } = useCourseStore();

  const isEdit = modal?.type === 'course-edit';
  const existing = modal?.data?.course as Course | undefined;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);
  const [skin, setSkin] = useState<SkinSelection | null>(null);

  useEffect(() => {
    if (isEdit && existing) {
      setName(existing.name);
      setCode(existing.code || '');
      setColor(existing.color);
      setDescription(existing.description || '');
      setSemester(existing.semester || '');
      setSkin(readSkin(existing.skin));
    }
  }, [modal]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        color,
        description: description.trim() || undefined,
        semester: semester.trim() || undefined,
        ...(isEdit ? { skin } : {}),
      };

      if (isEdit && existing) {
        await saveSkinWithPalette(skin, async (normalized) => {
          const updated = await updateCourse(existing.id, { ...payload, skin: normalized });
          const onUpdated = modal?.data?.onUpdated;
          if (typeof onUpdated === 'function') onUpdated(updated);
        });
        addToast('success', 'Project updated');
      } else {
        await createCourse(payload);
        addToast('success', 'Project created');
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save project:', err);
      addToast('error', 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Project' : 'New Project'}</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Project Name</label>
            <input
              type="text"
              placeholder="e.g. Linear Algebra, PI-046 Research, Case Notes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Short Code</label>
            <input
              type="text"
              placeholder="e.g. MATH201 or RESEARCH"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Color</label>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${color === c ? styles.active : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              placeholder="Brief project description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.field}>
            <label>Semester</label>
            <input
              type="text"
              placeholder="e.g. 2026 Spring"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
          </div>

          {isEdit && <SkinControls value={skin} inheritedValue={readSkin(globalSkin)} onChange={setSkin} inheritLabel="继承全局外观" disabled={saving} surface="all" advanced />}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
