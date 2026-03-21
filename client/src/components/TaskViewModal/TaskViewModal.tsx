import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Calendar, Clock, Target, BookOpen, Flag, CheckSquare, Square } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useTaskStore } from '@/stores/taskStore';
import { useCourseStore } from '@/stores/courseStore';
import { useGoalStore } from '@/stores/goalStore';
import type { Task } from '@shared/types';
import api from '@/services/api';
import CardBubble from '@/components/CardBubble/CardBubble';
import type { CardBubbleData } from '@/components/CardBubble/CardBubble';
import styles from './TaskViewModal.module.css';

interface TaskCardLink {
  id: string;
  card_id: string;
  checklist_index: number | null;
  card_title: string;
  template_type: string;
  deck_id: string;
  deck_name: string;
}

export default function TaskViewModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const openModal = useUIStore((s) => s.openModal);
  const { updateTask } = useTaskStore();
  const courses = useCourseStore((s) => s.courses);
  const goals = useGoalStore((s) => s.goals);

  const task = modal?.data?.task as Task | undefined;
  const [checklist, setChecklist] = useState<{ text: string; done: boolean }[]>([]);
  const [cardLinks, setCardLinks] = useState<TaskCardLink[]>([]);

  useEffect(() => {
    if (task?.checklist) {
      setChecklist([...task.checklist]);
    } else {
      setChecklist([]);
    }
  }, [task]);

  useEffect(() => {
    if (task?.id) {
      api.get(`/tasks/${task.id}/cards`)
        .then(({ data }) => setCardLinks(data))
        .catch(() => setCardLinks([]));
    }
  }, [task?.id]);

  const handleChecklistToggle = useCallback(async (index: number) => {
    if (!task) return;
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    setChecklist(updated);
    try {
      await updateTask(task.id, { checklist: updated });
    } catch (err) {
      console.error('Failed to update checklist:', err);
      // Revert on error
      setChecklist(checklist);
    }
  }, [task, checklist, updateTask]);

  const handleEdit = () => {
    closeModal();
    setTimeout(() => openModal('task-edit', { task: { ...task, checklist } }), 100);
  };

  if (!task) return null;

  const course = courses.find((c) => c.id === task.course_id);
  const goal = task.goal_id ? goals.find((g) => g.id === task.goal_id) : null;

  const priorityLabel = task.priority === 'must' ? 'Must' : task.priority === 'recommended' ? 'Recommended' : 'Optional';
  const priorityClass = task.priority === 'must' ? styles.priorityMust : task.priority === 'recommended' ? styles.priorityRecommended : styles.priorityOptional;

  // Format time display
  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
  };

  const startTime = formatTime(task.start_time);
  const endTime = formatTime(task.end_time);
  const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : startTime || null;

  // Separate card links: task-level vs checklist-level
  const taskLevelCards = cardLinks.filter((l) => l.checklist_index === null);
  const checklistCardMap = new Map<number, TaskCardLink[]>();
  for (const link of cardLinks) {
    if (link.checklist_index !== null) {
      const existing = checklistCardMap.get(link.checklist_index) || [];
      existing.push(link);
      checklistCardMap.set(link.checklist_index, existing);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{task.title}</h2>
          <div className={styles.headerActions}>
            <button className={styles.editBtn} onClick={handleEdit}>
              <Pencil size={14} />
              编辑
            </button>
            <button className={styles.closeBtn} onClick={closeModal}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status badge */}
        {task.status === 'completed' && (
          <div className={styles.completedBadge}>已完成</div>
        )}

        {/* Meta info */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Calendar size={14} />
            <span>{task.date}</span>
          </div>
          {timeDisplay && (
            <div className={styles.metaItem}>
              <Clock size={14} />
              <span>{timeDisplay}</span>
            </div>
          )}
          <div className={`${styles.metaItem} ${priorityClass}`}>
            <Flag size={14} />
            <span>{priorityLabel}</span>
          </div>
        </div>

        <div className={styles.metaRow}>
          {course && (
            <div className={styles.metaItem}>
              <BookOpen size={14} />
              <span>{course.name}</span>
            </div>
          )}
          {goal && (
            <div className={styles.metaItem}>
              <Target size={14} />
              <span>{goal.title}</span>
            </div>
          )}
        </div>

        {task.serves_must && (
          <div className={styles.servesMust}>
            Serves: {task.serves_must}
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div className={styles.section}>
            <p className={styles.description}>{task.description}</p>
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Checklist</h3>
            <div className={styles.checklistContainer}>
              {checklist.map((item, index) => {
                const linkedCards = checklistCardMap.get(index) || [];
                return (
                  <div key={index} className={styles.checklistItem}>
                    <button
                      className={styles.checklistToggle}
                      onClick={() => handleChecklistToggle(index)}
                    >
                      {item.done ? (
                        <CheckSquare size={18} className={styles.checkDone} />
                      ) : (
                        <Square size={18} className={styles.checkUndone} />
                      )}
                    </button>
                    <span className={`${styles.checklistText} ${item.done ? styles.checklistTextDone : ''}`}>
                      {item.text}
                    </span>
                    {linkedCards.length > 0 && (
                      <div className={styles.checklistCardTags}>
                        {linkedCards.map((link) => (
                          <CardBubble key={link.id} card={link as CardBubbleData} compact />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Task-level linked cards */}
        {taskLevelCards.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>关联卡片</h3>
            <div className={styles.cardBubbleGrid}>
              {taskLevelCards.map((link) => (
                <CardBubble key={link.id} card={link as CardBubbleData} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
