import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Tags, FileText } from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import TagGroupManager from '@/components/TagGroupManager/TagGroupManager';
import type { Course } from '@shared/types';
import { ProjectDeleteDialog } from './ProjectDeleteDialog';
import styles from './Courses.module.css';

export default function CoursesPage() {
  const courses = useCourseStore((s) => s.courses);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const modal = useUIStore((s) => s.modal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const handleDelete = async (action: 'delete_projection' | 'move_to_home') => {
    if (!confirmDelete) return;
    try {
      await deleteCourse(confirmDelete.id, action);
      addToast('success', 'Project deleted');
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Notebook workspace</div>
          <div className={styles.title}>Projects</div>
          <p className={styles.subtitle}>
            Organize course material, research packs, reports, and source-backed notes in one focused place.
          </p>
        </div>
        <button className={styles.primaryAction} onClick={() => openModal('course-create')}>
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div className={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card} onClick={() => navigate(`/projects/${course.id}`)} style={{ cursor: 'pointer' }}>
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
                  className={styles.filesBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${course.id}?focus=sources`);
                  }}
                >
                  <FileText size={12} />
                  Sources
                </button>
                <button
                  className={styles.tagsBtn}
                  onClick={(e) => { e.stopPropagation(); openModal('tag-group-manager', { courseId: course.id, courseName: course.name }); }}
                >
                  <Tags size={12} />
                  Tags
                </button>
                <button
                  className={styles.editBtn}
                  onClick={(e) => { e.stopPropagation(); openModal('course-edit', { course }); }}
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(course); }}
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
          Add Project
        </button>
      </div>

      {courses.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Start with a project</div>
          <p>
            A project can be a course, a research folder, a report workspace, or any focused collection of notes and sources.
          </p>
        </div>
      )}

      {confirmDelete && (
        <ProjectDeleteDialog
          projectId={confirmDelete.id}
          projectName={confirmDelete.name}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Tag Group Manager modal */}
      {modal?.type === 'tag-group-manager' && <TagGroupManager />}

    </div>
  );
}
