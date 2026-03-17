import { useState, useEffect, FormEvent } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useDeckStore } from '@/stores/deckStore';
import { useUIStore } from '@/stores/uiStore';
import type { CardDeck } from '@shared/types';
import styles from './DeckModal.module.css';

export default function DeckModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const courses = useCourseStore((s) => s.courses);
  const { createDeck, updateDeck } = useDeckStore();

  const isEdit = modal?.type === 'deck-edit';
  const existing = modal?.data?.deck as CardDeck | undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existing) {
      setName(existing.name);
      setDescription(existing.description || '');
      setCourseId(existing.course_id);
    } else {
      if (courses.length > 0) setCourseId(courses[0].id);
    }
  }, [modal]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !courseId) return;
    setSaving(true);

    try {
      if (isEdit && existing) {
        await updateDeck(existing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        addToast('success', 'Deck updated');
      } else {
        await createDeck({
          name: name.trim(),
          description: description.trim() || undefined,
          course_id: courseId,
        });
        addToast('success', 'Deck created');
      }
      closeModal();
    } catch {
      addToast('error', isEdit ? 'Failed to update deck' : 'Failed to create deck');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Deck' : 'New Deck'}</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g. Calculus Fundamentals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              placeholder="What is this deck about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {!isEdit && (
            <div className={styles.field}>
              <label>Course</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !name.trim() || !courseId}>
              {saving ? 'Saving...' : isEdit ? 'Update Deck' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
