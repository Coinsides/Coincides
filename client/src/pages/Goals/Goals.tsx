import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Flame, Trash2, ChevronDown, ListPlus, GitBranchPlus } from 'lucide-react';
import { useGoalStore } from '@/stores/goalStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import type { Goal, Task } from '@shared/types';
import api from '@/services/api';
import styles from './Goals.module.css';

function buildHierarchy(goals: Goal[]) {
  const topLevel = goals.filter((g) => !g.parent_id);
  const childrenMap = new Map<string, Goal[]>();
  for (const g of goals) {
    if (g.parent_id) {
      const children = childrenMap.get(g.parent_id) || [];
      children.push(g);
      childrenMap.set(g.parent_id, children);
    }
  }
  return { topLevel, childrenMap };
}

export default function GoalsPage() {
  const { goals, loading, fetchGoals, toggleExamMode, deleteGoal } = useGoalStore();
  const courses = useCourseStore((s) => s.courses);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const [courseFilter, setCourseFilter] = useState('');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [goalTasks, setGoalTasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    fetchGoals(courseFilter || undefined);
  }, [courseFilter]);

  const getCourse = (id: string) => courses.find((c) => c.id === id);

  const handleToggleExpand = async (goal: Goal) => {
    if (expandedGoal === goal.id) {
      setExpandedGoal(null);
      return;
    }
    setExpandedGoal(goal.id);
    if (!goalTasks[goal.id]) {
      try {
        const { data } = await api.get('/tasks', { params: { course_id: goal.course_id } });
        const filtered = data.filter((t: Task) => t.goal_id === goal.id);
        setGoalTasks((prev) => ({ ...prev, [goal.id]: filtered }));
      } catch (err) {
        console.error('Failed to delete goal:', err);
        addToast('error', 'Failed to delete goal');
        // silently fail
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      addToast('success', 'Goal deleted');
    } catch (err) {
      console.error('Failed to delete goal:', err);
      addToast('error', 'Failed to delete goal');
    }
  };

  const handleExamMode = async (id: string) => {
    try {
      await toggleExamMode(id);
    } catch (err) {
      console.error('Failed to toggle exam mode:', err);
      addToast('error', 'Failed to toggle exam mode');
    }
  };

  const handleAddTask = (goal: Goal) => {
    openModal('task-create', { goal_id: goal.id, course_id: goal.course_id });
  };

  const handleAddSubGoal = (goal: Goal) => {
    openModal('goal-create', { parent_id: goal.id });
  };

  const filteredGoals = courseFilter
    ? goals.filter((g) => g.course_id === courseFilter)
    : goals;

  const { topLevel, childrenMap } = buildHierarchy(filteredGoals);

  const renderGoalCard = (goal: Goal, isChild: boolean) => {
    const course = getCourse(goal.course_id);
    const tasks = goalTasks[goal.id] || [];
    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const isExpanded = expandedGoal === goal.id;
    const children = childrenMap.get(goal.id) || [];

    return (
      <div
        key={goal.id}
        className={`${styles.goalCard} ${isChild ? styles.childGoalCard : ''}`}
      >
        <div className={styles.goalHeader} onClick={() => handleToggleExpand(goal)}>
          <div className={styles.goalInfo}>
            <span className={styles.goalTitle}>{goal.title}</span>
            {course && (
              <span
                className={styles.courseBadge}
                style={{
                  backgroundColor: course.color + '18',
                  color: course.color,
                }}
              >
                {course.code || course.name}
              </span>
            )}
            {goal.deadline && (
              <span className={styles.deadline}>
                Due {format(new Date(goal.deadline), 'MMM d')}
              </span>
            )}
            {children.length > 0 && (
              <span className={styles.childCount}>
                {children.length} sub-goal{children.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className={styles.goalActions}>
            <div className={styles.goalCardActions}>
              <button
                className={styles.addTaskBtn}
                onClick={(e) => { e.stopPropagation(); handleAddTask(goal); }}
                title="Add task to this goal"
              >
                <ListPlus size={14} />
                Task
              </button>
              <button
                className={styles.addSubGoalBtn}
                onClick={(e) => { e.stopPropagation(); handleAddSubGoal(goal); }}
                title="Add sub-goal"
              >
                <GitBranchPlus size={14} />
                Sub-goal
              </button>
            </div>
            <button
              className={`${styles.examToggle} ${goal.exam_mode ? styles.active : ''}`}
              onClick={(e) => { e.stopPropagation(); handleExamMode(goal.id); }}
              title={goal.exam_mode ? 'Disable exam mode' : 'Enable exam mode'}
            >
              {goal.exam_mode ? (
                <span className={styles.examPill}>⚡ EXAM MODE</span>
              ) : (
                <Flame size={16} />
              )}
            </button>
            <button
              className={styles.deleteGoalBtn}
              onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}
            >
              <Trash2 size={14} />
            </button>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          </div>
        </div>

        <div className={styles.progressRow}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          {totalCount > 0 && (
            <div className={styles.progressText}>
              {completedCount}/{totalCount} tasks completed ({Math.round(progress)}%)
            </div>
          )}
        </div>

        {isExpanded && tasks.length > 0 && (
          <div className={styles.goalTasks}>
            {tasks.map((task) => (
              <div key={task.id} className={styles.goalTaskItem}>
                <span className={styles.dot} style={{ background: task.status === 'completed' ? 'var(--success)' : 'var(--text-muted)' }} />
                <span style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none', opacity: task.status === 'completed' ? 0.6 : 1 }}>
                  {task.title}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                  {task.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Goals</div>
        <div className={styles.headerRight}>
          <select
            className={styles.filterSelect}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className={styles.addBtn} onClick={() => openModal('goal-create')}>
            <Plus size={14} />
            New Goal
          </button>
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <div className={styles.empty}>
          <h3>No goals yet</h3>
          <p>Create your first goal to start tracking your study progress.</p>
        </div>
      ) : (
        <div className={styles.goalList}>
          {topLevel.map((goal) => (
            <div key={goal.id}>
              {renderGoalCard(goal, false)}
              {childrenMap.get(goal.id)?.map((child) => renderGoalCard(child, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
