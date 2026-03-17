import { useState } from 'react';
import { Plus, Edit2, Trash2, Tags } from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import TagGroupManager from '@/components/TagGroupManager/TagGroupManager';
import type { Course } from '@shared/types';
import styles from './Courses.module.css';

export default function CoursesPage() {
  const courses = useCourseStore((s) => s.courses);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const modal = useUIStore((s) => s.modal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteCourse(confirmDelete.id);
      addToast('success', 'Course deleted');
      setConfirmDelete(null);
    } catch {
      addToast('error', 'Failed to delete course');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Courses</div>
      </div>

      <div className={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            <div className={styles.cardColor} style={{ backgroundColor: course.color }} />
            <div className={styles.cardBody}>
              <div className={styles.cardName}>{course.name}</div>
              <div className={styles.cardCode}>{course.code || 'No code'}{course.semester ? ` · ${course.semester}` : ''}</div>
              {course.description && (
                <div className={styles.cardDescription}>{course.description}</div>
              )}
              <div className={styles.cardMeta}>
                <span className={`${styles.weightBadge} ${styles[`weight${course.weight}`]}`}>
                  {course.weight === 1 ? 'Low' : course.weight === 2 ? 'Medium' : 'High'}
                </span>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.tagsBtn}
                  onClick={() => openModal('tag-group-manager', { courseId: course.id, courseName: course.name })}
                >
                  <Tags size={12} />
                  Tags
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => openModal('course-edit', { course })}
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => setConfirmDelete(course)}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        <button className={styles.addCard} onClick={() => openModal('course-create')}>
          <Plus size={20} />
          Add Course
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Delete Course</div>
            <div className={styles.confirmText}>
              Are you sure you want to delete "{confirmDelete.name}"? This will also delete all associated tasks, goals, and data. This action cannot be undone.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Group Manager modal */}
      {modal?.type === 'tag-group-manager' && <TagGroupManager />}
    </div>
  );
}
