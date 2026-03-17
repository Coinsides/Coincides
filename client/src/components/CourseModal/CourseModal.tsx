import { useState, useEffect, FormEvent } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import type { Course } from '@shared/types';
import styles from './CourseModal.module.css';

const PRESET_COLORS = [
  '#6366f1', '#818cf8', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#8b5cf6', '#64748b',
];

export default function CourseModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const { createCourse, updateCourse } = useCourseStore();

  const isEdit = modal?.type === 'course-edit';
  const existing = modal?.data?.course as Course | undefined;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [weight, setWeight] = useState(5);
  const [semester, setSemester] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existing) {
      setName(existing.name);
      setCode(existing.code || '');
      setColor(existing.color);
      setWeight(existing.weight);
      setSemester(existing.semester || '');
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
        weight,
        semester: semester.trim() || undefined,
      };

      if (isEdit && existing) {
        await updateCourse(existing.id, payload);
        addToast('success', 'Course updated');
      } else {
        await createCourse(payload);
        addToast('success', 'Course created');
      }
      closeModal();
    } catch {
      addToast('error', 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Course' : 'New Course'}</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Course Name</label>
            <input
              type="text"
              placeholder="e.g. Linear Algebra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Course Code</label>
            <input
              type="text"
              placeholder="e.g. MATH201"
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
            <label>Weight (1-10)</label>
            <div className={styles.weightRow}>
              <input
                type="range"
                min={1}
                max={10}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className={styles.weightSlider}
              />
              <span className={styles.weightValue}>{weight}</span>
            </div>
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
