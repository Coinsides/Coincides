import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Plus, Target, Layers, FileText, Upload,
  CheckCircle2, Circle, Pause, RotateCcw, BookOpen,
} from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import DocumentManager from '@/components/DocumentManager/DocumentManager';
import api from '@/services/api';
import type { Course, Goal } from '@shared/types';
import styles from './CourseDetail.module.css';

interface GoalSummary extends Goal {
  task_count: number;
  completed_task_count: number;
}

interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  card_count: number;
  due_count: number;
  created_at: string;
}

interface DocSummary {
  id: string;
  filename: string;
  file_type: string;
  parse_status: string;
  page_count: number | null;
  created_at: string;
}

interface CourseSummaryData {
  course: Course;
  goals: GoalSummary[];
  decks: DeckSummary[];
  documents: DocSummary[];
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  active: Circle,
  completed: CheckCircle2,
  paused: Pause,
};

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const modal = useUIStore((s) => s.modal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);

  const [data, setData] = useState<CourseSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/courses/${courseId}/summary`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch course summary:', err);
      addToast('error', 'Failed to load course');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleDelete = async () => {
    if (!courseId) return;
    try {
      await deleteCourse(courseId);
      addToast('success', 'Course deleted');
      navigate('/courses');
    } catch {
      addToast('error', 'Failed to delete course');
    }
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const { course, goals, decks, documents } = data;

  // Separate root goals (no parent) from sub-goals
  const rootGoals = goals.filter((g) => !g.parent_id);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/courses')}>
          <ArrowLeft size={18} />
          <span>Courses</span>
        </button>
        <div className={styles.headerRight}>
          <button
            className={styles.headerAction}
            onClick={() => openModal('course-edit', { course })}
          >
            <Edit2 size={15} />
            Edit
          </button>
          <button
            className={`${styles.headerAction} ${styles.headerActionDanger}`}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      {/* Course Info */}
      <div className={styles.courseInfo}>
        <div className={styles.colorBar} style={{ backgroundColor: course.color }} />
        <div className={styles.courseTitle}>{course.name}</div>
        <div className={styles.courseMeta}>
          {course.code && <span>{course.code}</span>}
          {course.semester && <span>{course.semester}</span>}
          <span className={`${styles.weightBadge} ${styles[`weight${course.weight}`]}`}>
            {course.weight === 1 ? 'Low' : course.weight === 2 ? 'Medium' : 'High'}
          </span>
        </div>
        {course.description && (
          <div className={styles.courseDescription}>{course.description}</div>
        )}
      </div>

      {/* Goals Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Target size={18} />
            <span>Goals</span>
            <span className={styles.sectionCount}>{rootGoals.length}</span>
          </div>
          <button
            className={styles.sectionAddBtn}
            onClick={() => openModal('goal-create', { courseId: course.id })}
          >
            <Plus size={15} />
            Add Goal
          </button>
        </div>
        {rootGoals.length === 0 ? (
          <div className={styles.empty}>No goals yet</div>
        ) : (
          <div className={styles.goalList}>
            {rootGoals.map((goal) => {
              const StatusIcon = STATUS_ICONS[goal.status] || Circle;
              const progress = goal.task_count > 0
                ? Math.round((goal.completed_task_count / goal.task_count) * 100)
                : 0;
              return (
                <div
                  key={goal.id}
                  className={styles.goalCard}
                  onClick={() => openModal('goal-edit', { goal })}
                >
                  <div className={styles.goalStatus}>
                    <StatusIcon size={16} className={styles[`status_${goal.status}`]} />
                  </div>
                  <div className={styles.goalBody}>
                    <div className={styles.goalTitle}>{goal.title}</div>
                    <div className={styles.goalMeta}>
                      <span>{goal.task_count} tasks</span>
                      {goal.task_count > 0 && (
                        <span className={styles.goalProgress}>{progress}% done</span>
                      )}
                      {goal.deadline && (
                        <span className={styles.goalDeadline}>
                          Due {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {goal.exam_mode && (
                      <span className={styles.examBadge}>Exam</span>
                    )}
                  </div>
                  {goal.task_count > 0 && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Decks Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Layers size={18} />
            <span>Card Decks</span>
            <span className={styles.sectionCount}>{decks.length}</span>
          </div>
          <button
            className={styles.sectionAddBtn}
            onClick={() => openModal('deck-create', { courseId: course.id })}
          >
            <Plus size={15} />
            Add Deck
          </button>
        </div>
        {decks.length === 0 ? (
          <div className={styles.empty}>No decks yet</div>
        ) : (
          <div className={styles.deckGrid}>
            {decks.map((deck) => (
              <div
                key={deck.id}
                className={styles.deckCard}
                onClick={() => navigate(`/decks/${deck.id}`)}
              >
                <div className={styles.deckName}>{deck.name}</div>
                {deck.description && (
                  <div className={styles.deckDesc}>{deck.description}</div>
                )}
                <div className={styles.deckStats}>
                  <span className={styles.deckCardCount}>
                    <BookOpen size={13} />
                    {deck.card_count} cards
                  </span>
                  {deck.due_count > 0 && (
                    <span className={styles.deckDue}>
                      {deck.due_count} due
                    </span>
                  )}
                </div>
                <button
                  className={styles.reviewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/review?deckId=${deck.id}`);
                  }}
                >
                  <RotateCcw size={13} />
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <FileText size={18} />
            <span>Documents</span>
            <span className={styles.sectionCount}>{documents.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={styles.sectionAddBtn}
              onClick={() => openModal('document-manager', { courseId: course.id, courseName: course.name })}
            >
              <Upload size={14} />
              上传 / 管理
            </button>
          </div>
        </div>
        {documents.length === 0 ? (
          <div className={styles.empty}>No documents yet</div>
        ) : (
          <div className={styles.docList}>
            {documents.map((doc) => (
              <div key={doc.id} className={styles.docItem}>
                <FileText size={15} className={styles.docIcon} />
                <span className={styles.docName}>{doc.filename}</span>
                {doc.page_count && (
                  <span className={styles.docPages}>{doc.page_count} pages</span>
                )}
                <span className={`${styles.docStatus} ${styles[`parse_${doc.parse_status}`]}`}>
                  {doc.parse_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Manager Modal */}
      {modal?.type === 'document-manager' && <DocumentManager />}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Delete Course</div>
            <div className={styles.confirmText}>
              Are you sure you want to delete "{course.name}"? This will also delete all associated goals, tasks, decks, cards, and documents. This action cannot be undone.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
