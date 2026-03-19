import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Plus, Flame, Trash2, ChevronRight, ListPlus, GitBranchPlus,
  GripVertical, CheckCircle2, Circle, Pause, MoreHorizontal, Link2, X,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGoalStore } from '@/stores/goalStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import type { Goal, Task, GoalDependency } from '@shared/types';
import api from '@/services/api';
import styles from './Goals.module.css';

// ─── Helpers ────────────────────────────────────────────────

interface TreeNode {
  goal: Goal;
  children: TreeNode[];
  depth: number;
}

function buildTree(goals: Goal[]): TreeNode[] {
  const childrenMap = new Map<string | null, Goal[]>();
  for (const g of goals) {
    const key = g.parent_id ?? null;
    const arr = childrenMap.get(key) || [];
    arr.push(g);
    childrenMap.set(key, arr);
  }

  function makeNodes(parentId: string | null, depth: number): TreeNode[] {
    const siblings = childrenMap.get(parentId) || [];
    return siblings.map((goal) => ({
      goal,
      children: makeNodes(goal.id, depth + 1),
      depth,
    }));
  }

  return makeNodes(null, 0);
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const flat: TreeNode[] = [];
  for (const node of nodes) {
    flat.push(node);
    if (expanded.has(node.goal.id) && node.children.length > 0) {
      flat.push(...flattenTree(node.children, expanded));
    }
  }
  return flat;
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  active: Circle,
  completed: CheckCircle2,
  paused: Pause,
};

// ─── Sortable Goal Row ──────────────────────────────────────

interface SortableGoalRowProps {
  node: TreeNode;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleStatus: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onExamMode: (id: string) => void;
  onAddTask: (goal: Goal) => void;
  onAddSubGoal: (goal: Goal) => void;
  getCourse: (id: string) => any;
  progress: { total: number; completed: number; percent: number } | null;
  goalTasks: Task[];
  showTasks: boolean;
  onToggleTasks: (goal: Goal) => void;
  // Dependencies
  dependencies: GoalDependency[];
  allGoals: Goal[];
  onAddDependency: (goalId: string, depGoalId: string) => void;
  onRemoveDependency: (goalId: string, depId: string) => void;
}

function SortableGoalRow({
  node, isExpanded, onToggleExpand, onToggleStatus, onDelete,
  onExamMode, onAddTask, onAddSubGoal, getCourse, progress,
  goalTasks, showTasks, onToggleTasks,
  dependencies, allGoals, onAddDependency, onRemoveDependency,
}: SortableGoalRowProps) {
  const { goal, children, depth } = node;
  const [showDepPicker, setShowDepPicker] = useState(false);
  const course = getCourse(goal.course_id);
  const hasChildren = children.length > 0;
  const StatusIcon = STATUS_ICONS[goal.status] || Circle;

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: `${depth * 28 + 16}px`,
  };

  const pct = progress?.percent ?? 0;

  return (
    <div ref={setNodeRef} style={style} className={styles.goalRow} {...attributes}>
      {/* Connector lines */}
      {depth > 0 && (
        <div className={styles.connectorLines}>
          {Array.from({ length: depth }).map((_, i) => (
            <div
              key={i}
              className={styles.verticalLine}
              style={{ left: `${i * 28 + 26}px` }}
            />
          ))}
          <div
            className={styles.horizontalLine}
            style={{ left: `${(depth - 1) * 28 + 26}px` }}
          />
        </div>
      )}

      {/* Drag handle */}
      <button className={styles.dragHandle} {...listeners} tabIndex={-1}>
        <GripVertical size={14} />
      </button>

      {/* Expand / collapse */}
      {hasChildren ? (
        <button
          className={`${styles.expandBtn} ${isExpanded ? styles.expanded : ''}`}
          onClick={() => onToggleExpand(goal.id)}
        >
          <ChevronRight size={14} />
        </button>
      ) : (
        <span className={styles.expandPlaceholder} />
      )}

      {/* Status icon */}
      <button
        className={`${styles.statusIcon} ${styles[`status_${goal.status}`]}`}
        onClick={() => onToggleStatus(goal)}
        title={goal.status}
      >
        <StatusIcon size={16} />
      </button>

      {/* Title + badges */}
      <div className={styles.goalContent} onClick={() => onToggleTasks(goal)}>
        <span className={styles.goalTitle}>{goal.title}</span>
        {course && (
          <span
            className={styles.courseBadge}
            style={{ backgroundColor: (course.color || '#6366f1') + '18', color: course.color || '#6366f1' }}
          >
            {course.code || course.name}
          </span>
        )}
        {goal.deadline && (
          <span className={styles.deadline}>
            Due {format(new Date(goal.deadline), 'MMM d')}
          </span>
        )}
        {hasChildren && (
          <span className={styles.childCount}>
            {children.length} sub-goal{children.length !== 1 ? 's' : ''}
          </span>
        )}
        {/* Dependency badges */}
        {dependencies.length > 0 && dependencies.map((dep) => {
          const depGoal = allGoals.find((g) => g.id === dep.depends_on_goal_id);
          if (!depGoal) return null;
          return (
            <span key={dep.id} className={styles.depBadge} title={`Prerequisite: ${depGoal.title}`}>
              <Link2 size={9} />
              {depGoal.title.length > 14 ? depGoal.title.slice(0, 14) + '…' : depGoal.title}
              <button
                className={styles.depRemoveBtn}
                onClick={(e) => { e.stopPropagation(); onRemoveDependency(goal.id, dep.id); }}
              >
                <X size={9} />
              </button>
            </span>
          );
        })}
      </div>

      {/* Progress */}
      {progress && progress.total > 0 && (
        <div className={styles.progressMini}>
          <div className={styles.progressBarMini}>
            <div className={styles.progressFillMini} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressLabel}>{pct}%</span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.goalActions}>
        <button className={styles.actionBtn} onClick={() => onAddTask(goal)} title="Add task">
          <ListPlus size={14} />
        </button>
        <button className={styles.actionBtn} onClick={() => onAddSubGoal(goal)} title="Add sub-goal">
          <GitBranchPlus size={14} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowDepPicker(!showDepPicker)}
            title="Set prerequisite"
          >
            <Link2 size={14} />
          </button>
          {showDepPicker && (
            <div className={styles.depPicker} onClick={(e) => e.stopPropagation()}>
              <div className={styles.depPickerTitle}>Set prerequisite</div>
              {allGoals
                .filter((g) => g.id !== goal.id && g.course_id === goal.course_id && !dependencies.some((d) => d.depends_on_goal_id === g.id))
                .map((g) => (
                  <button
                    key={g.id}
                    className={styles.depPickerItem}
                    onClick={() => { onAddDependency(goal.id, g.id); setShowDepPicker(false); }}
                  >
                    {g.title}
                  </button>
                ))}
              {allGoals.filter((g) => g.id !== goal.id && g.course_id === goal.course_id && !dependencies.some((d) => d.depends_on_goal_id === g.id)).length === 0 && (
                <div className={styles.depPickerEmpty}>No available goals</div>
              )}
            </div>
          )}
        </div>
        <button
          className={`${styles.actionBtn} ${goal.exam_mode ? styles.examActive : ''}`}
          onClick={() => onExamMode(goal.id)}
          title={goal.exam_mode ? 'Disable exam mode' : 'Enable exam mode'}
        >
          {goal.exam_mode ? (
            <span className={styles.examPill}>EXAM</span>
          ) : (
            <Flame size={14} />
          )}
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => onDelete(goal.id)}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded task list */}
      {showTasks && goalTasks.length > 0 && (
        <div className={styles.taskList} style={{ marginLeft: `${depth * 28 + 48}px` }}>
          {goalTasks.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <span
                className={styles.taskDot}
                style={{ background: task.status === 'completed' ? 'var(--success)' : 'var(--text-muted)' }}
              />
              <span
                style={{
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  opacity: task.status === 'completed' ? 0.6 : 1,
                }}
              >
                {task.title}
              </span>
              <span className={styles.taskDate}>{task.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function GoalsPage() {
  const { goals, loading, fetchGoals, toggleExamMode, deleteGoal, updateGoal, reorderGoals, progressMap, fetchProgress, fetchAllProgress, dependencyMap, fetchDependencies, addDependency, removeDependency } = useGoalStore();
  const courses = useCourseStore((s) => s.courses);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const [courseFilter, setCourseFilter] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [showTasksFor, setShowTasksFor] = useState<string | null>(null);
  const [goalTasks, setGoalTasks] = useState<Record<string, Task[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchGoals(courseFilter || undefined);
  }, [courseFilter]);

  // Fetch progress + dependencies for all goals after loading
  useEffect(() => {
    if (goals.length > 0) {
      fetchAllProgress();
      // Fetch dependencies for each goal
      goals.forEach((g) => fetchDependencies(g.id));
    }
  }, [goals.length]);

  const getCourse = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses]
  );

  const filteredGoals = useMemo(
    () => courseFilter ? goals.filter((g) => g.course_id === courseFilter) : goals,
    [goals, courseFilter]
  );

  const tree = useMemo(() => buildTree(filteredGoals), [filteredGoals]);
  const flatList = useMemo(() => flattenTree(tree, expandedGoals), [tree, expandedGoals]);

  // ─── Handlers ──────────

  const handleToggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTasks = async (goal: Goal) => {
    if (showTasksFor === goal.id) {
      setShowTasksFor(null);
      return;
    }
    setShowTasksFor(goal.id);
    if (!goalTasks[goal.id]) {
      try {
        const { data } = await api.get('/tasks', { params: { course_id: goal.course_id } });
        const filtered = data.filter((t: Task) => t.goal_id === goal.id);
        setGoalTasks((prev) => ({ ...prev, [goal.id]: filtered }));
      } catch {
        // silently fail
      }
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    const nextStatus = goal.status === 'active' ? 'completed' : goal.status === 'completed' ? 'paused' : 'active';
    try {
      await updateGoal(goal.id, { status: nextStatus as any });
      addToast('success', `Goal marked as ${nextStatus}`);
    } catch {
      addToast('error', 'Failed to update goal status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      addToast('success', 'Goal deleted');
    } catch {
      addToast('error', 'Failed to delete goal');
    }
  };

  const handleExamMode = async (id: string) => {
    try {
      await toggleExamMode(id);
    } catch {
      addToast('error', 'Failed to toggle exam mode');
    }
  };

  const handleAddTask = (goal: Goal) => {
    openModal('task-create', { goal_id: goal.id, course_id: goal.course_id });
  };

  const handleAddSubGoal = (goal: Goal) => {
    openModal('goal-create', { parent_id: goal.id });
  };

  const handleAddDependency = async (goalId: string, depGoalId: string) => {
    try {
      await addDependency(goalId, depGoalId);
      addToast('success', 'Prerequisite added');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to add prerequisite';
      addToast('error', msg);
    }
  };

  const handleRemoveDependency = async (goalId: string, depId: string) => {
    try {
      await removeDependency(goalId, depId);
      addToast('success', 'Prerequisite removed');
    } catch {
      addToast('error', 'Failed to remove prerequisite');
    }
  };

  // ─── Drag & Drop ──────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeGoal = filteredGoals.find((g) => g.id === active.id);
    const overGoal = filteredGoals.find((g) => g.id === over.id);
    if (!activeGoal || !overGoal) return;

    // Same parent — reorder within siblings
    const parentId = overGoal.parent_id;
    const siblings = filteredGoals
      .filter((g) => g.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Remove active from its current position
    const filteredSiblings = siblings.filter((g) => g.id !== activeGoal.id);
    const overIndex = filteredSiblings.findIndex((g) => g.id === overGoal.id);

    // Insert active at the new position
    filteredSiblings.splice(overIndex, 0, { ...activeGoal, parent_id: parentId });

    // Build reorder items
    const items = filteredSiblings.map((g, i) => ({
      id: g.id,
      parent_id: parentId,
      sort_order: i,
    }));

    reorderGoals(items).catch(() => {
      addToast('error', 'Failed to reorder goals');
    });
  };

  const activeNode = activeId ? flatList.find((n) => n.goal.id === activeId) : null;

  // ─── Render ────────────

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={flatList.map((n) => n.goal.id)} strategy={verticalListSortingStrategy}>
            <div className={styles.goalList}>
              {flatList.map((node) => {
                const prog = progressMap[node.goal.id];
                const progData = prog
                  ? { total: prog.all_tasks.total, completed: prog.all_tasks.completed, percent: prog.progress }
                  : null;

                return (
                  <SortableGoalRow
                    key={node.goal.id}
                    node={node}
                    isExpanded={expandedGoals.has(node.goal.id)}
                    onToggleExpand={handleToggleExpand}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDelete}
                    onExamMode={handleExamMode}
                    onAddTask={handleAddTask}
                    onAddSubGoal={handleAddSubGoal}
                    getCourse={getCourse}
                    progress={progData}
                    goalTasks={goalTasks[node.goal.id] || []}
                    showTasks={showTasksFor === node.goal.id}
                    onToggleTasks={handleToggleTasks}
                    dependencies={dependencyMap[node.goal.id] || []}
                    allGoals={filteredGoals}
                    onAddDependency={handleAddDependency}
                    onRemoveDependency={handleRemoveDependency}
                  />
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeNode && (
              <div className={`${styles.goalRow} ${styles.dragOverlay}`}>
                <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
                <span className={styles.goalTitle}>{activeNode.goal.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
