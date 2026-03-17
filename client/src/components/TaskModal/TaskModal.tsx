import { useState, useEffect, FormEvent } from 'react';
import { format } from 'date-fns';
import { useCourseStore } from '@/stores/courseStore';
import { useGoalStore } from '@/stores/goalStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import { useDailyBriefStore } from '@/stores/dailyBriefStore';
import { TaskPriority } from '@shared/types';
import type { Task } from '@shared/types';
import styles from './TaskModal.module.css';

const priorities: { value: TaskPriority; label: string }[] = [
  { value: TaskPriority.Must, label: 'Must' },
  { value: TaskPriority.Recommended, label: 'Recommended' },
  { value: TaskPriority.Optional, label: 'Optional' },
];

export default function TaskModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const courses = useCourseStore((s) => s.courses);
  const goals = useGoalStore((s) => s.goals);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const { createTask, updateTask, deleteTask } = useTaskStore();
  const fetchDailyBrief = useDailyBriefStore((s) => s.fetchDailyBrief);

  const isEdit = modal?.type === 'task-edit';
  const existingTask = modal?.data?.task as Task | undefined;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Must);
  const [courseId, setCourseId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existingTask) {
      setTitle(existingTask.title);
      setDate(existingTask.date);
      setPriority(existingTask.priority as TaskPriority);
      setCourseId(existingTask.course_id);
      setGoalId(existingTask.goal_id || '');
    } else {
      if (modal?.data?.date) setDate(modal.data.date);
      if (courses.length > 0 && !courseId) setCourseId(courses[0].id);
    }
  }, [modal]);

  useEffect(() => {
    if (courseId) fetchGoals(courseId);
  }, [courseId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) return;
    setSaving(true);

    try {
      if (isEdit && existingTask) {
        await updateTask(existingTask.id, { title, date, priority });
        addToast('success', 'Task updated');
      } else {
        await createTask({
          title: title.trim(),
          date,
          priority,
          course_id: courseId,
          goal_id: goalId || undefined,
        });
        addToast('success', 'Task created');
      }
      fetchDailyBrief();
      closeModal();
    } catch {
      addToast('error', 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingTask) return;
    try {
      await deleteTask(existingTask.id);
      addToast('success', 'Task deleted');
      fetchDailyBrief();
      closeModal();
    } catch {
      addToast('error', 'Failed to delete task');
    }
  };

  const courseGoals = goals.filter((g) => g.course_id === courseId);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Task' : 'New Task'}</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className={styles.field}>
            <label>Priority</label>
            <div className={styles.priorityGroup}>
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`${styles.priorityPill} ${styles[p.value]} ${priority === p.value ? styles.active : ''}`}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label>Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {courseGoals.length > 0 && (
            <div className={styles.field}>
              <label>Goal (optional)</label>
              <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">No goal</option>
                {courseGoals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actions}>
            <div>
              {isEdit && (
                <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
                  Delete
                </button>
              )}
            </div>
            <div className={styles.actionsRight}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving || !title.trim() || !courseId}>
                {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
