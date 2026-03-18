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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<{text: string; done: boolean}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && existingTask) {
      setTitle(existingTask.title);
      setDate(existingTask.date);
      setPriority(existingTask.priority as TaskPriority);
      setCourseId(existingTask.course_id);
      setGoalId(existingTask.goal_id || '');
      if (existingTask.start_time) setStartTime(existingTask.start_time);
      if (existingTask.end_time) setEndTime(existingTask.end_time);
      if (existingTask.description) setDescription(existingTask.description);
      if (existingTask.checklist) setChecklist(existingTask.checklist);
    } else {
      if (modal?.data?.date) setDate(modal.data.date);
      if (modal?.data?.course_id) setCourseId(modal.data.course_id);
      else if (courses.length > 0 && !courseId) setCourseId(courses[0].id);
      if (modal?.data?.goal_id) setGoalId(modal.data.goal_id);
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
      const checklistPayload = checklist.length > 0 ? checklist : undefined;

      if (isEdit && existingTask) {
        await updateTask(existingTask.id, {
          title,
          date,
          priority,
          start_time: startTime || null,
          end_time: endTime || null,
          description: description || null,
          checklist: checklistPayload ?? null,
        });
        addToast('success', 'Task updated');
      } else {
        await createTask({
          title: title.trim(),
          date,
          priority,
          course_id: courseId,
          goal_id: goalId || undefined,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          description: description || undefined,
          checklist: checklistPayload,
        });
        addToast('success', 'Task created');
      }
      fetchDailyBrief();
      closeModal();
    } catch (err) {
      console.error('Failed to save task:', err);
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
    } catch (err) {
      console.error('Failed to delete task:', err);
      addToast('error', 'Failed to delete task');
    }
  };

  const addChecklistItem = () => {
    setChecklist([...checklist, { text: '', done: false }]);
  };

  const updateChecklistItem = (index: number, field: 'text' | 'done', value: string | boolean) => {
    setChecklist(checklist.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
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
            <label>Time Range (optional)</label>
            <div className={styles.timeRange}>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Start time"
              />
              <span className={styles.timeRangeSep}>to</span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="End time"
              />
            </div>
          </div>

          <div className={styles.descriptionField}>
            <label>Description (optional)</label>
            <textarea
              placeholder="Task notes or details..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.checklistSection}>
            <label>Checklist</label>
            {checklist.map((item, i) => (
              <div key={i} className={styles.checklistItem}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => updateChecklistItem(i, 'done', e.target.checked)}
                />
                <input
                  type="text"
                  placeholder="Checklist item..."
                  value={item.text}
                  onChange={(e) => updateChecklistItem(i, 'text', e.target.value)}
                />
                <button type="button" className={styles.removeChecklistBtn} onClick={() => removeChecklistItem(i)}>
                  &times;
                </button>
              </div>
            ))}
            <button type="button" className={styles.addChecklistBtn} onClick={addChecklistItem}>
              + Add checklist item
            </button>
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
