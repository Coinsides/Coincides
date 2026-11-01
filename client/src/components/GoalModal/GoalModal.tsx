import { useState, useEffect, FormEvent } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import { useGoalStore } from '@/stores/goalStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import { TaskPriority } from '@shared/types';
import type { Goal, Task } from '@shared/types';
import styles from './GoalModal.module.css';

interface TaskEntry {
  title: string;
  date: string;
}

export default function GoalModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const courses = useCourseStore((s) => s.courses);
  const { goals, createGoal, updateGoal } = useGoalStore();
  const { batchCreateTasks } = useTaskStore();

  const isEdit = modal?.type === 'goal-edit';
  const existing = modal?.data?.goal as Goal | undefined;
  const parentId = modal?.data?.parent_id as string | undefined;
  const parentGoal = parentId ? goals.find((g) => g.id === parentId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [courseId, setCourseId] = useState('');
  const [taskEntries, setTaskEntries] = useState<TaskEntry[]>([]);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);

  // Editing shows the goal's tasks; the task list has no goal filter, so read the course's tasks.
  useEffect(() => {
    if (!isEdit || !existing) {
      setExistingTasks([]);
      return;
    }
    let cancelled = false;
    api.get<Task[]>('/tasks', { params: { course_id: existing.course_id } })
      .then(({ data }) => { if (!cancelled) setExistingTasks(data.filter((task) => task.goal_id === existing.id)); })
      .catch((err) => console.error('Failed to load goal tasks:', err));
    return () => { cancelled = true; };
  }, [isEdit, existing?.id, existing?.course_id]);

  useEffect(() => {
    if (isEdit && existing) {
      setTitle(existing.title);
      setDescription(existing.description || '');
      setDeadline(existing.deadline || '');
      setCourseId(existing.course_id);
    } else {
      // Pre-fill course_id from parent goal if creating sub-goal
      if (parentGoal) {
        setCourseId(parentGoal.course_id);
      } else if (courses.length > 0) {
        setCourseId(courses[0].id);
      }
    }
  }, [modal]);

  const addTaskEntry = () => {
    setTaskEntries([...taskEntries, { title: '', date: format(new Date(), 'yyyy-MM-dd') }]);
  };

  const updateTaskEntry = (index: number, field: keyof TaskEntry, value: string) => {
    setTaskEntries(taskEntries.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const removeTaskEntry = (index: number) => {
    setTaskEntries(taskEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) return;
    setSaving(true);

    try {
      const goal = isEdit && existing
        ? await updateGoal(existing.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline || undefined,
        })
        : await createGoal({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline || undefined,
          course_id: courseId,
          parent_id: parentId,
        });

      // Batch create tasks if any
      const validTasks = taskEntries.filter((t) => t.title.trim());
      if (validTasks.length > 0) {
        await batchCreateTasks(
          validTasks.map((t) => ({
            title: t.title.trim(),
            date: t.date,
            priority: TaskPriority.Must,
            course_id: courseId,
            goal_id: goal.id,
          }))
        );
      }

      addToast('success', isEdit ? 'Goal saved' : parentId ? 'Sub-goal created' : 'Goal created');
      closeModal();
    } catch (err) {
      console.error('Failed to save goal:', err);
      addToast('error', isEdit ? 'Failed to save goal' : 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Goal' : parentId ? 'New Sub-Goal' : 'New Goal'}</div>
        {parentGoal && (
          <div className={styles.parentHint}>
            Sub-goal of: <strong>{parentGoal.title}</strong>
          </div>
        )}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              placeholder="e.g. Master Chapter 5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.field}>
            <label>Description</label>
            <textarea
              placeholder="What does completing this goal look like?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Course</label>
            {/* A goal cannot move between courses; the update API has no course field. */}
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required disabled={isEdit}>
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          {isEdit && (
            <div className={styles.taskGenSection}>
              <div className={styles.taskGenHeader}>Tasks</div>
              {existingTasks.length === 0 ? (
                <div className={styles.parentHint}>No tasks yet</div>
              ) : existingTasks.map((task) => (
                <div key={task.id} className={styles.taskGenRow}>
                  <span>{task.title}</span>
                  <span>{task.date}</span>
                </div>
              ))}
            </div>
          )}

          {/* Task generation */}
          <div className={styles.taskGenSection}>
            <div className={styles.taskGenHeader}>{isEdit ? 'Add tasks (optional)' : 'Generate Tasks (optional)'}</div>
            {taskEntries.map((entry, i) => (
              <div key={i} className={styles.taskGenRow}>
                <input
                  type="text"
                  placeholder="Task title"
                  value={entry.title}
                  onChange={(e) => updateTaskEntry(i, 'title', e.target.value)}
                />
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => updateTaskEntry(i, 'date', e.target.value)}
                  style={{ maxWidth: 140 }}
                />
                <button type="button" className={styles.removeTaskBtn} onClick={() => removeTaskEntry(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className={styles.addTaskRow} onClick={addTaskEntry}>
              + Add task
            </button>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !title.trim() || !courseId}>
              {saving ? 'Saving...' : isEdit ? 'Save Goal' : parentId ? 'Create Sub-Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
