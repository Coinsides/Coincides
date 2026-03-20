import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Plus, Check, Sparkles, Edit3, Trash2, Clock, AlignLeft, CheckSquare, Target, Pencil, Grid3x3 } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useCourseStore } from '@/stores/courseStore';
import { useGoalStore } from '@/stores/goalStore';
import { useTimeBlockStore } from '@/stores/timeBlockStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import type { Task, ResolvedTimeBlock } from '@shared/types';
import { TimeBlockType } from '@shared/types';
import styles from './Calendar.module.css';

type CalendarView = 'month' | 'week';

const PRIORITY_COLORS: Record<string, string> = {
  must: 'var(--priority-must)',
  recommended: 'var(--priority-recommended)',
  optional: 'var(--priority-optional)',
};

const DEFAULT_COURSE_COLOR = '#6366f1';

// Time Block colors by type
const TB_COLORS: Record<string, string> = {
  study: '#3b82f6',   // blue
  sleep: '#4b5563',   // dark gray
  custom: '#8b5cf6',  // purple
};

function getTBColor(block: ResolvedTimeBlock): string {
  return block.color || TB_COLORS[block.type] || TB_COLORS.custom;
}

/** Convert 'HH:MM' to percentage position in a 24h column (fallback) */
function timeStrToPercent(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return ((h + m / 60) / 24) * 100;
}

/** Convert 'HH:MM' to percentage within a dynamic [rangeStart, rangeEnd] (in hours) */
function timeStrToPercentDynamic(t: string, rangeStartH: number, rangeEndH: number): number {
  const [h, m] = t.split(':').map(Number);
  const hours = h + m / 60;
  const span = rangeEndH - rangeStartH;
  if (span <= 0) return 0;
  return ((hours - rangeStartH) / span) * 100;
}

/** Convert minutes-from-midnight to hours (e.g. 510 → 8.5) */
function minToHours(min: number): number {
  return min / 60;
}

/** Convert 'HH:MM' to a display label like '9:00' */
function formatHHMM(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Snap a percentage (0-100) to 30-min grid within a dynamic hour range */
function snapToGridDynamic(pct: number, rangeStartH: number, rangeEndH: number): number {
  const span = rangeEndH - rangeStartH;
  const minutes = (pct / 100) * span * 60 + rangeStartH * 60;
  const snapped = Math.round(minutes / 30) * 30;
  const clampedMin = Math.max(rangeStartH * 60, Math.min(rangeEndH * 60, snapped));
  return ((clampedMin - rangeStartH * 60) / (span * 60)) * 100;
}

function pctToHHMMDynamic(pct: number, rangeStartH: number, rangeEndH: number): string {
  const span = rangeEndH - rangeStartH;
  const totalMin = Math.round((pct / 100) * span * 60 + rangeStartH * 60);
  const clamped = Math.max(0, Math.min(1440, totalMin));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Compute nesting depth for each block. Longer blocks are parents; shorter blocks nested inside get depth+1 */
function computeNestingLevels(blocks: ResolvedTimeBlock[]): Map<string, number> {
  if (blocks.length === 0) return new Map();

  // Sort by duration descending (longest first = bottom layer)
  const sorted = [...blocks].sort((a, b) => {
    const durA = timeStrToPercent(a.end_time) - timeStrToPercent(a.start_time);
    const durB = timeStrToPercent(b.end_time) - timeStrToPercent(b.start_time);
    return durB - durA;
  });

  const levels = new Map<string, number>();

  for (const block of sorted) {
    const bStart = timeStrToPercent(block.start_time);
    const bEnd = timeStrToPercent(block.end_time);
    let maxParentLevel = -1;

    // Check if this block is fully contained within any already-processed (longer) block
    for (const parent of sorted) {
      if (parent.id === block.id) continue;
      if (!levels.has(parent.id)) continue; // not processed yet = shorter, skip
      const pStart = timeStrToPercent(parent.start_time);
      const pEnd = timeStrToPercent(parent.end_time);
      if (bStart >= pStart && bEnd <= pEnd) {
        maxParentLevel = Math.max(maxParentLevel, levels.get(parent.id)!);
      }
    }

    levels.set(block.id, maxParentLevel + 1);
  }

  return levels;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [view, setView] = useState<CalendarView>('month');
  const [editMode, setEditMode] = useState(false);
  const [gridPreference, setGridPreference] = useState<'always' | 'edit-only'>(() => {
    return (localStorage.getItem('tb-grid-preference') as 'always' | 'edit-only') || 'edit-only';
  });
  const showGridlines = editMode || gridPreference === 'always';

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);

  // Time Block context menu + edit state
  const [tbContextMenu, setTBContextMenu] = useState<{ x: number; y: number; block: ResolvedTimeBlock } | null>(null);
  const [tbEditBlock, setTBEditBlock] = useState<ResolvedTimeBlock | null>(null);
  const [tbEditLabel, setTBEditLabel] = useState('');
  const [tbEditType, setTBEditType] = useState<'study' | 'sleep' | 'custom'>('study');
  const [tbEditStart, setTBEditStart] = useState('');
  const [tbEditEnd, setTBEditEnd] = useState('');
  const [tbEditColor, setTBEditColor] = useState('');
  const [tbDeleteConfirm, setTBDeleteConfirm] = useState<ResolvedTimeBlock | null>(null);

  // Time Block drag-select state
  const [dragSelect, setDragSelect] = useState<{ dayIdx: number; startPct: number; currentPct: number } | null>(null);
  // After drag completes, persist the selection for right-click menu
  const [dragSelection, setDragSelection] = useState<{ dayIdx: number; startTime: string; endTime: string } | null>(null);
  // Right-click create menu position
  const [tbCreateMenu, setTBCreateMenu] = useState<{ x: number; y: number } | null>(null);
  // Create modal (overlay edit panel for new TB)
  const [showTBCreateModal, setShowTBCreateModal] = useState(false);
  const [tbCreateLabel, setTBCreateLabel] = useState('');
  const [tbCreateType, setTBCreateType] = useState<'study' | 'sleep' | 'custom'>('study');
  const [tbCreateStart, setTBCreateStart] = useState('');
  const [tbCreateEnd, setTBCreateEnd] = useState('');
  const [tbCreateColor, setTBCreateColor] = useState('');
  const timedSectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { tasks, fetchTasksByRange, deleteTask } = useTaskStore();
  const courses = useCourseStore((s) => s.courses);
  const { goals, fetchGoals } = useGoalStore();
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);
  const { weekData, fetchWeek, createBlocks, updateBlock, deleteBlock } = useTimeBlockStore();

  // Fetch time blocks for week view
  useEffect(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      fetchWeek(format(weekStart, 'yyyy-MM-dd'));
    }
  }, [currentMonth, view]);

  // Fetch tasks for visible range
  useEffect(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (view === 'week') {
      rangeStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
    } else {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    }

    fetchTasksByRange(
      format(rangeStart, 'yyyy-MM-dd'),
      format(rangeEnd, 'yyyy-MM-dd'),
      courseFilter || undefined
    );
  }, [currentMonth, courseFilter, view]);

  // Fetch goals for goal label lookup
  useEffect(() => {
    fetchGoals();
  }, []);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Build week days (for week view)
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentMonth]);

  // Dynamic time range for week view (TB-R4)
  const { rangeStartH, rangeEndH } = useMemo(() => {
    const DEFAULT_START = 8;
    const DEFAULT_END = 22;
    if (!weekData || Object.keys(weekData).length === 0) {
      return { rangeStartH: DEFAULT_START, rangeEndH: DEFAULT_END };
    }
    let minStart = 24;
    let maxEnd = 0;
    let hasBlocks = false;
    for (const dayData of Object.values(weekData)) {
      for (const block of dayData.blocks || []) {
        hasBlocks = true;
        const [sh, sm] = block.start_time.split(':').map(Number);
        const [eh, em] = block.end_time.split(':').map(Number);
        const startH = sh + sm / 60;
        const endH = eh + em / 60;
        if (startH < minStart) minStart = startH;
        if (endH > maxEnd) maxEnd = endH;
      }
    }
    if (!hasBlocks) return { rangeStartH: DEFAULT_START, rangeEndH: DEFAULT_END };
    // Pad ±1 hour, clamp to [0, 24]
    return {
      rangeStartH: Math.max(0, Math.floor(minStart) - 1),
      rangeEndH: Math.min(24, Math.ceil(maxEnd) + 1),
    };
  }, [weekData]);

  // Helper: convert HH:MM to percent using the dynamic range
  const toPct = useCallback((t: string) => timeStrToPercentDynamic(t, rangeStartH, rangeEndH), [rangeStartH, rangeEndH]);

  // Group tasks by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.date]) map[task.date] = [];
      map[task.date].push(task);
    }
    return map;
  }, [tasks]);

  // Lookup helpers
  const getCourse = (id: string) => courses.find((c) => c.id === id);
  const getGoal = (id: string | null) => id ? goals.find((g) => g.id === id) : null;
  const getCourseColor = (courseId: string) => getCourse(courseId)?.color || DEFAULT_COURSE_COLOR;

  // Courses that have tasks in current view (for legend)
  const activeCourses = useMemo(() => {
    const courseIds = new Set(tasks.map((t) => t.course_id));
    return courses.filter((c) => courseIds.has(c.id));
  }, [tasks, courses]);

  const handleDayClick = async (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const { data } = await api.get('/tasks', { params: { date: dateStr } });
      setDayTasks(data);
    } catch (err) {
      console.error('Failed to load calendar tasks:', err);
      addToast('error', 'Failed to load tasks');
      setDayTasks([]);
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { status: newStatus });
      setDayTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
      addToast('error', 'Failed to update task');
    }
  };

  const groupedDayTasks = useMemo(() => {
    const groups = { must: [] as Task[], recommended: [] as Task[], optional: [] as Task[] };
    for (const t of dayTasks) {
      const p = t.priority as keyof typeof groups;
      if (groups[p]) groups[p].push(t);
    }
    return groups;
  }, [dayTasks]);

  // Close context menus on any click
  useEffect(() => {
    const handler = () => { setContextMenu(null); setTBContextMenu(null); setTBCreateMenu(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, task });
  };

  const handleDeleteTask = async (taskId: string) => {
    setContextMenu(null);
    try {
      await deleteTask(taskId);
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data } = await api.get('/tasks', { params: { date: dateStr } });
        setDayTasks(data);
      }
      // Re-fetch the visible range
      let rangeStart: Date;
      let rangeEnd: Date;
      if (view === 'week') {
        rangeStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
      } else {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      }
      fetchTasksByRange(format(rangeStart, 'yyyy-MM-dd'), format(rangeEnd, 'yyyy-MM-dd'), courseFilter || undefined);
      addToast('success', 'Task deleted');
    } catch (err) {
      console.error('Failed to update task time:', err);
      addToast('error', 'Failed to delete task');
    }
  };

  // ── Time Block right-click handlers ──────────────────

  const handleTBContextMenu = (e: React.MouseEvent, block: ResolvedTimeBlock) => {
    e.preventDefault();
    e.stopPropagation();
    setTBContextMenu({ x: e.clientX, y: e.clientY, block });
  };

  const openTBEdit = (block: ResolvedTimeBlock) => {
    setTBContextMenu(null);
    setTBEditBlock(block);
    setTBEditLabel(block.label);
    setTBEditType(block.type as 'study' | 'sleep' | 'custom');
    setTBEditStart(block.start_time);
    setTBEditEnd(block.end_time);
    setTBEditColor(block.color || '');
  };

  const handleTBEditSave = async () => {
    if (!tbEditBlock) return;
    try {
      await updateBlock(tbEditBlock.id, {
        label: tbEditLabel.trim() || undefined,
        type: tbEditType as any,
        start_time: tbEditStart || undefined,
        end_time: tbEditEnd || undefined,
        color: tbEditColor || undefined,
      });
      // Refresh week data
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      fetchWeek(format(weekStart, 'yyyy-MM-dd'));
      setTBEditBlock(null);
      addToast('success', 'Time block updated');
    } catch {
      addToast('error', 'Failed to update time block');
    }
  };

  const handleTBDelete = async () => {
    if (!tbDeleteConfirm) return;
    try {
      await deleteBlock(tbDeleteConfirm.id);
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      fetchWeek(format(weekStart, 'yyyy-MM-dd'));
      setTBDeleteConfirm(null);
      addToast('success', 'Time block deleted');
    } catch {
      addToast('error', 'Failed to delete time block');
    }
  };

  const getTimePosition = useCallback((timeStr: string): number => {
    const date = new Date(timeStr);
    const hours = date.getHours() + date.getMinutes() / 60;
    const span = rangeEndH - rangeStartH;
    if (span <= 0) return 0;
    return ((hours - rangeStartH) / span) * 100;
  }, [rangeStartH, rangeEndH]);

  const getBlockHeight = useCallback((start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const span = rangeEndH - rangeStartH;
    if (span <= 0) return 0;
    return Math.max((durationHours / span) * 100, 2.5); // min 2.5% so it's visible
  }, [rangeStartH, rangeEndH]);

  const formatTimeRange = (start: string, end: string): string => {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  };

  // ── Time Block drag-select handlers ───────────────────────

  const handleTBMouseDown = useCallback((dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode) return; // Only allow drag-select in edit mode
    const rect = e.currentTarget.getBoundingClientRect();
    const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
    const pct = snapToGridDynamic(rawPct, rangeStartH, rangeEndH);
    setDragSelect({ dayIdx, startPct: pct, currentPct: pct });
    e.preventDefault();
  }, [editMode, rangeStartH, rangeEndH]);

  const handleTBMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, dayIdx: number) => {
    if (!dragSelect || dragSelect.dayIdx !== dayIdx) return;
    const ref = timedSectionRefs.current[dayIdx];
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const rawPct = ((e.clientY - rect.top) / rect.height) * 100;
    const pct = snapToGridDynamic(rawPct, rangeStartH, rangeEndH);
    setDragSelect((prev) => prev ? { ...prev, currentPct: pct } : null);
  }, [dragSelect, rangeStartH, rangeEndH]);

  const handleTBMouseUp = useCallback(() => {
    if (!dragSelect) return;
    const topPct = Math.min(dragSelect.startPct, dragSelect.currentPct);
    const botPct = Math.max(dragSelect.startPct, dragSelect.currentPct);
    if (botPct - topPct < 1) {
      setDragSelect(null);
      return;
    }
    // Keep selection highlighted, wait for right-click
    setDragSelection({
      dayIdx: dragSelect.dayIdx,
      startTime: pctToHHMMDynamic(topPct, rangeStartH, rangeEndH),
      endTime: pctToHHMMDynamic(botPct, rangeStartH, rangeEndH),
    });
    setDragSelect(null);
  }, [dragSelect, rangeStartH, rangeEndH]);

  // Global mouseup to end drag
  useEffect(() => {
    const handler = () => {
      if (dragSelect) handleTBMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [dragSelect, handleTBMouseUp]);

  // Right-click on the timed section after drag-selection
  const handleTimedSectionContextMenu = useCallback((e: React.MouseEvent, dayIdx: number) => {
    if (!dragSelection || dragSelection.dayIdx !== dayIdx) return;
    e.preventDefault();
    e.stopPropagation();
    setTBCreateMenu({ x: e.clientX, y: e.clientY });
  }, [dragSelection]);

  // Open the create modal from the right-click menu
  const openTBCreateModal = () => {
    if (!dragSelection) return;
    setTBCreateMenu(null);
    setTBCreateLabel('');
    setTBCreateType('study');
    setTBCreateStart(dragSelection.startTime);
    setTBCreateEnd(dragSelection.endTime);
    setTBCreateColor('');
    setShowTBCreateModal(true);
  };

  const handleTBCreateSubmit = async () => {
    if (!dragSelection || !tbCreateLabel.trim()) return;
    const day = weekDays[dragSelection.dayIdx];
    const dayOfWeek = day.getDay(); // 0=Sun
    try {
      await createBlocks([{
        label: tbCreateLabel.trim(),
        type: tbCreateType as any,
        day_of_week: dayOfWeek,
        start_time: tbCreateStart,
        end_time: tbCreateEnd,
        color: tbCreateColor || undefined,
      }]);
      // Refresh week data
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      fetchWeek(format(weekStart, 'yyyy-MM-dd'));
      setShowTBCreateModal(false);
      setDragSelection(null);
      addToast('success', 'Time block created');
    } catch {
      addToast('error', 'Failed to create time block');
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>Calendar</div>
        <div className={styles.controls}>
          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'month' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('month')}
            >Month</button>
            <button
              className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('week')}
            >Week</button>
          </div>

          <button className={styles.navBtn} onClick={() => setCurrentMonth(view === 'week' ? subWeeks(currentMonth, 1) : subMonths(currentMonth, 1))}>
            <ChevronLeft size={16} />
          </button>
          <span className={styles.monthLabel}>
            {view === 'week'
              ? `${format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
              : format(currentMonth, 'MMMM yyyy')
            }
          </span>
          <button className={styles.navBtn} onClick={() => setCurrentMonth(view === 'week' ? addWeeks(currentMonth, 1) : addMonths(currentMonth, 1))}>
            <ChevronRight size={16} />
          </button>

          {/* Year selector */}
          <select
            className={styles.filterSelect}
            value={currentMonth.getFullYear()}
            onChange={(e) => {
              const newYear = parseInt(e.target.value, 10);
              const updated = new Date(currentMonth);
              updated.setFullYear(newYear);
              setCurrentMonth(updated);
            }}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

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
          {view === 'week' && (
            <>
              <button
                className={`${styles.editModeBtn} ${editMode ? styles.editModeBtnActive : ''}`}
                onClick={() => { setEditMode(!editMode); if (editMode) { setDragSelection(null); setDragSelect(null); } }}
                title={editMode ? 'Exit edit mode' : 'Enter edit mode to create Time Blocks'}
              >
                <Pencil size={14} />
              </button>
              <button
                className={`${styles.editModeBtn} ${gridPreference === 'always' ? styles.editModeBtnActive : ''}`}
                onClick={() => {
                  const next = gridPreference === 'always' ? 'edit-only' : 'always';
                  setGridPreference(next);
                  localStorage.setItem('tb-grid-preference', next);
                }}
                title={gridPreference === 'always' ? 'Grid: always shown (click to toggle)' : 'Grid: edit mode only (click to toggle)'}
              >
                <Grid3x3 size={14} />
              </button>
            </>
          )}
          <button
            className={styles.aiBtn}
            onClick={() => openAgentWithContext('calendar', { date: format(currentMonth, 'yyyy-MM-dd') })}
            title="Ask AI to help plan this week"
          >
            <Sparkles size={14} />
          </button>
        </div>
      </div>

      {/* Course color legend */}
      {activeCourses.length > 0 && (
        <div className={styles.courseLegend}>
          {activeCourses.map((c) => (
            <div key={c.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: c.color || DEFAULT_COURSE_COLOR }} />
              <span className={styles.legendLabel}>{c.code || c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {view === 'month' ? (
        <div className={styles.grid}>
          <div className={styles.weekHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className={styles.weekDay}>{d}</div>
            ))}
          </div>
          <div className={styles.days}>
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTaskList = tasksByDate[dateStr] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={dateStr}
                  className={`${styles.dayCell} ${!inMonth ? styles.otherMonth : ''} ${isToday(day) ? styles.today : ''} ${selected ? styles.selected : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={styles.dayNumber}>{format(day, 'd')}</div>
                  <div className={styles.taskDots}>
                    {dayTaskList.slice(0, 8).map((t) => (
                      <span
                        key={t.id}
                        className={styles.taskDot}
                        style={{ backgroundColor: getCourseColor(t.course_id) }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week view */
        <div className={styles.weekGrid}>
          {/* Dynamic time gutter */}
          <div className={styles.timeGutter}>
            <div className={styles.timeGutterHeader} />
            <div className={styles.timeGutterBody}>
              {Array.from({ length: rangeEndH - rangeStartH }, (_, i) => {
                const hour = rangeStartH + i;
                return (
                  <div
                    key={hour}
                    className={styles.timeGutterLabel}
                    style={{ top: `${(i / (rangeEndH - rangeStartH)) * 100}%` }}
                  >
                    {`${hour}:00`}
                  </div>
                );
              })}
            </div>
          </div>
          {weekDays.map((day, dayIdx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTaskList = tasksByDate[dateStr] || [];
            const selected = selectedDate && isSameDay(day, selectedDate);
            const allDayTasks = dayTaskList.filter((t) => !t.start_time || !t.end_time);
            const timedTasks = dayTaskList.filter((t) => t.start_time && t.end_time);
            const dayBlocks = weekData[dateStr];
            const resolvedBlocks = dayBlocks?.blocks || [];
            const nestingLevels = computeNestingLevels(resolvedBlocks);
            // Count tasks associated with each block
            const blockTaskCounts = new Map<string, number>();
            for (const t of dayTaskList) {
              if (t.time_block_id) {
                blockTaskCounts.set(t.time_block_id, (blockTaskCounts.get(t.time_block_id) || 0) + 1);
              }
            }

            // Drag-select preview for this column (active drag or persistent selection)
            const isDraggingHere = dragSelect?.dayIdx === dayIdx;
            const hasSelection = dragSelection?.dayIdx === dayIdx;
            const dragTop = isDraggingHere ? Math.min(dragSelect!.startPct, dragSelect!.currentPct) : 0;
            const dragHeight = isDraggingHere ? Math.abs(dragSelect!.currentPct - dragSelect!.startPct) : 0;
            // Persistent selection preview
            const selTop = hasSelection ? toPct(dragSelection!.startTime) : 0;
            const selHeight = hasSelection ? toPct(dragSelection!.endTime) - selTop : 0;

            return (
              <div
                key={dateStr}
                className={`${styles.weekColumn} ${isToday(day) ? styles.weekColumnToday : ''} ${selected ? styles.weekColumnSelected : ''} ${editMode ? styles.weekColumnEditMode : ''}`}
              >
                <div className={styles.weekColumnHeader}>
                  <span className={styles.weekColumnDay}>{format(day, 'EEE')}</span>
                  <span
                    className={`${styles.weekColumnDate} ${isToday(day) ? styles.weekColumnDateToday : ''}`}
                    onClick={() => handleDayClick(day)}
                    title="View day tasks"
                  >{format(day, 'd')}</span>
                </div>
                {/* All-day tasks — colored by course */}
                {allDayTasks.length > 0 && (
                  <div className={styles.allDaySection}>
                    {allDayTasks.map((t) => {
                      const courseColor = getCourseColor(t.course_id);
                      const goal = getGoal(t.goal_id);
                      return (
                        <div
                          key={t.id}
                          className={`${styles.weekTask} ${t.status === 'completed' ? styles.weekTaskDone : ''}`}
                          style={{ borderLeftColor: courseColor }}
                          onContextMenu={(e) => handleContextMenu(e, t)}
                        >
                          <span className={styles.weekTaskTitle}>{t.title}</span>
                          {goal && (
                            <span className={styles.goalBadge} title={goal.title}>
                              <Target size={9} />
                              {goal.title.length > 12 ? goal.title.slice(0, 12) + '…' : goal.title}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Timed section with Time Block backgrounds */}
                <div
                  className={styles.timedSection}
                  ref={(el) => { timedSectionRefs.current[dayIdx] = el; }}
                  style={editMode ? { cursor: 'crosshair' } : undefined}
                  onMouseDown={(e) => { setDragSelection(null); setTBCreateMenu(null); handleTBMouseDown(dayIdx, e); }}
                  onMouseMove={(e) => handleTBMouseMove(e, dayIdx)}
                  onContextMenu={(e) => handleTimedSectionContextMenu(e, dayIdx)}
                >
                  {/* Hour gridlines (visible in edit mode or when preference is 'always') */}
                  {showGridlines && Array.from({ length: rangeEndH - rangeStartH }, (_, i) => {
                    const hour = rangeStartH + i;
                    return (
                      <div
                        key={`grid-${hour}`}
                        className={styles.hourGridline}
                        style={{ top: `${(i / (rangeEndH - rangeStartH)) * 100}%` }}
                      />
                    );
                  })}

                  {/* Time Block background layer — with nesting indentation */}
                  {resolvedBlocks.map((block) => {
                    const top = toPct(block.start_time);
                    const height = toPct(block.end_time) - top;
                    const color = getTBColor(block);
                    const level = nestingLevels.get(block.id) || 0;
                    // Deeper nesting → more indent + higher opacity + higher z-index
                    const indent = level * 8; // 8px per nesting level
                    const bgOpacity = level === 0 ? '20' : level === 1 ? '30' : '40';
                    const borderOpacity = level === 0 ? '40' : level === 1 ? '60' : '80';
                    return (
                      <Fragment key={`tb-group-${block.id}`}>
                        <div
                          className={styles.tbBackground}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            left: `${indent}px`,
                            right: '0px',
                            backgroundColor: color + bgOpacity,
                            borderLeft: `3px solid ${color}${borderOpacity}`,
                            zIndex: level,
                          }}
                          title={`${block.label} (${formatHHMM(block.start_time)}–${formatHHMM(block.end_time)})`}
                          onContextMenu={(e) => handleTBContextMenu(e, block)}
                        >
                          <span className={styles.tbLabel}>{block.label}</span>
                          <span className={styles.tbTime}>{formatHHMM(block.start_time)}–{formatHHMM(block.end_time)}</span>
                          {(blockTaskCounts.get(block.id) || 0) > 0 && (
                            <span className={styles.tbTaskBadge}>
                              {blockTaskCounts.get(block.id)} task{blockTaskCounts.get(block.id)! > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Annotation lines at block edges */}
                        <div
                          className={styles.tbAnnotationLine}
                          style={{ top: `${top}%`, zIndex: level + 10 }}
                        >
                          <span className={styles.tbAnnotationLabel}>{formatHHMM(block.start_time)}</span>
                        </div>
                        <div
                          className={styles.tbAnnotationLine}
                          style={{ top: `${top + height}%`, zIndex: level + 10 }}
                        >
                          <span className={styles.tbAnnotationLabel}>{formatHHMM(block.end_time)}</span>
                        </div>
                      </Fragment>
                    );
                  })}

                  {/* Drag-select preview (active dragging) */}
                  {isDraggingHere && dragHeight > 0 && (
                    <div
                      className={styles.tbDragPreview}
                      style={{ top: `${dragTop}%`, height: `${dragHeight}%` }}
                    >
                      <span className={styles.tbDragLabel}>
                        {pctToHHMMDynamic(dragTop, rangeStartH, rangeEndH)} – {pctToHHMMDynamic(dragTop + dragHeight, rangeStartH, rangeEndH)}
                      </span>
                    </div>
                  )}

                  {/* Persistent selection highlight (after mouseup, before right-click) */}
                  {hasSelection && selHeight > 0 && (
                    <div
                      className={styles.tbDragPreview}
                      style={{ top: `${selTop}%`, height: `${selHeight}%` }}
                    >
                      <span className={styles.tbDragLabel}>
                        {formatHHMM(dragSelection!.startTime)} – {formatHHMM(dragSelection!.endTime)}
                      </span>
                    </div>
                  )}

                  {/* Timed tasks — float above Time Blocks */}
                  {timedTasks.map((t) => {
                    const top = getTimePosition(t.start_time!);
                    const height = getBlockHeight(t.start_time!, t.end_time!);
                    const courseColor = getCourseColor(t.course_id);
                    return (
                      <div
                        key={t.id}
                        className={`${styles.taskBlock} ${t.status === 'completed' ? styles.taskBlockDone : ''}`}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          backgroundColor: courseColor + '22',
                          borderLeftColor: courseColor,
                        }}
                        onContextMenu={(e) => handleContextMenu(e, t)}
                        title={`${t.title}\n${formatTimeRange(t.start_time!, t.end_time!)}`}
                      >
                        <span className={styles.timeBlockTime}>
                          {formatTimeRange(t.start_time!, t.end_time!)}
                        </span>
                        <span className={styles.timeBlockTitle}>{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => { openModal('task-edit', { task: contextMenu.task }); setContextMenu(null); }}
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => handleDeleteTask(contextMenu.task.id)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Day detail panel */}
      {selectedDate && (
        <>
          <div className={styles.detailOverlay} onClick={() => setSelectedDate(null)} />
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <span className={styles.detailDate}>{format(selectedDate, 'EEEE, MMMM d')}</span>
              <button className={styles.closeBtn} onClick={() => setSelectedDate(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.detailContent}>
              {dayTasks.length === 0 ? (
                <div className={styles.emptyDay}>No tasks for this day</div>
              ) : (
                (['must', 'recommended', 'optional'] as const).map((priority) => {
                  const group = groupedDayTasks[priority];
                  if (group.length === 0) return null;
                  return (
                    <div key={priority} className={styles.priorityGroup}>
                      <div className={styles.priorityLabel}>
                        <span className={styles.priorityLabelDot} style={{ backgroundColor: PRIORITY_COLORS[priority] }} />
                        {priority}
                      </div>
                      {group.map((task) => {
                        const course = getCourse(task.course_id);
                        const goal = getGoal(task.goal_id);
                        const courseColor = course?.color || DEFAULT_COURSE_COLOR;
                        const checklistDone = task.checklist?.filter((c) => c.done).length ?? 0;
                        const checklistTotal = task.checklist?.length ?? 0;
                        return (
                          <div
                            key={task.id}
                            className={styles.detailTaskItem}
                            style={{ borderLeftColor: courseColor }}
                            onContextMenu={(e) => handleContextMenu(e, task)}
                          >
                            <button
                              className={`${styles.checkbox} ${task.status === 'completed' ? styles.checked : ''}`}
                              onClick={() => toggleTask(task)}
                              style={{ width: 18, height: 18, border: `2px solid var(--border-default)`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: task.status === 'completed' ? courseColor : 'transparent', borderColor: task.status === 'completed' ? courseColor : undefined }}
                            >
                              {task.status === 'completed' && <Check size={12} color="white" />}
                            </button>
                            <div
                              className={styles.taskClickable}
                              onClick={(e) => { e.stopPropagation(); openModal('task-edit', { task }); }}
                              style={{ color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}
                            >
                              <div className={styles.taskTitleRow}>
                                {task.title}
                                {goal && (
                                  <span className={styles.goalLabel}>
                                    <Target size={10} />
                                    {goal.title}
                                  </span>
                                )}
                              </div>
                              {(task.start_time || task.description || (checklistTotal > 0)) && (
                                <div className={styles.taskMeta}>
                                  {task.start_time && task.end_time && (
                                    <span className={styles.taskMetaItem}>
                                      <Clock size={10} />
                                      {formatTimeRange(task.start_time, task.end_time)}
                                    </span>
                                  )}
                                  {task.description && (
                                    <span className={styles.taskMetaItem}>
                                      <AlignLeft size={10} />
                                      {task.description.split('\n')[0].slice(0, 50)}
                                    </span>
                                  )}
                                  {checklistTotal > 0 && (
                                    <span className={styles.taskMetaItem}>
                                      <CheckSquare size={10} />
                                      {checklistDone}/{checklistTotal} items
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className={styles.taskActions}>
                              {course && (
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: courseColor + '18', color: courseColor, fontWeight: 500, flexShrink: 0 }}>
                                  {course.code || course.name}
                                </span>
                              )}
                              <button
                                className={styles.taskActionBtn}
                                onClick={(e) => { e.stopPropagation(); openModal('task-edit', { task }); }}
                                title="Edit task"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                className={`${styles.taskActionBtn} ${styles.taskActionBtnDanger}`}
                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
              <button
                className={styles.addTaskBtn}
                onClick={() => openModal('task-create', { date: format(selectedDate, 'yyyy-MM-dd') })}
              >
                <Plus size={14} />
                Add task
              </button>
            </div>
          </div>
        </>
      )}

      {/* Time Block context menu (existing block) */}
      {tbContextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: tbContextMenu.x, top: tbContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => openTBEdit(tbContextMenu.block)}
          >
            <Edit3 size={14} />
            Edit
          </button>
          <button
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => { setTBDeleteConfirm(tbContextMenu.block); setTBContextMenu(null); }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Time Block create context menu (after drag-select) */}
      {tbCreateMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: tbCreateMenu.x, top: tbCreateMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={openTBCreateModal}
          >
            <Plus size={14} />
            Add Time Block
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => { setDragSelection(null); setTBCreateMenu(null); }}
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      )}

      {/* Time Block create modal (overlay edit panel) */}
      {showTBCreateModal && (() => {
        // Check if this day already has a study block
        const dayStr = dragSelection ? format(weekDays[dragSelection.dayIdx], 'yyyy-MM-dd') : '';
        const dayBlocks = dayStr ? (weekData[dayStr]?.blocks || []) : [];
        const hasStudyBlock = dayBlocks.some(b => b.type === 'study');
        const studyConflict = tbCreateType === 'study' && hasStudyBlock;
        return (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowTBCreateModal(false); setDragSelection(null); } }}>
          <div className={styles.tbEditModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.tbEditTitle}>New Time Block</div>
            <div className={styles.tbEditField}>
              <label>Label</label>
              <input
                type="text"
                value={tbCreateLabel}
                onChange={(e) => setTBCreateLabel(e.target.value)}
                className={styles.tbFormInput}
                placeholder="e.g. Study, Rest, Meal"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && tbCreateLabel.trim()) handleTBCreateSubmit(); if (e.key === 'Escape') { setShowTBCreateModal(false); setDragSelection(null); } }}
              />
            </div>
            <div className={styles.tbEditField}>
              <label>Type</label>
              <select
                value={tbCreateType}
                onChange={(e) => setTBCreateType(e.target.value as any)}
                className={styles.tbFormSelect}
              >
                <option value="study">Study</option>
                <option value="sleep">Sleep</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className={styles.tbEditRow}>
              <div className={styles.tbEditField}>
                <label>Start</label>
                <input
                  type="time"
                  value={tbCreateStart}
                  onChange={(e) => setTBCreateStart(e.target.value)}
                  className={styles.tbFormInput}
                />
              </div>
              <div className={styles.tbEditField}>
                <label>End</label>
                <input
                  type="time"
                  value={tbCreateEnd}
                  onChange={(e) => setTBCreateEnd(e.target.value)}
                  className={styles.tbFormInput}
                />
              </div>
            </div>
            <div className={styles.tbEditField}>
              <label>Color (optional)</label>
              <input
                type="color"
                value={tbCreateColor || '#8b5cf6'}
                onChange={(e) => setTBCreateColor(e.target.value)}
                className={styles.tbColorInput}
              />
            </div>
            {studyConflict && (
              <p style={{ color: 'var(--error, #ef4444)', fontSize: 12, margin: '0 0 8px' }}>
                This day already has a Study Block. Only one Study Block per day is allowed.
              </p>
            )}
            <div className={styles.tbEditActions}>
              <button className={styles.tbFormCancel} onClick={() => { setShowTBCreateModal(false); setDragSelection(null); }}>Cancel</button>
              <button className={styles.tbFormSave} onClick={handleTBCreateSubmit} disabled={!tbCreateLabel.trim() || studyConflict}>Save</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Time Block edit modal */}
      {tbEditBlock && (() => {
        // Study constraint check for edit: if changing to study, check day already has one
        const editDayKey = Object.keys(weekData).find(d => {
          const blocks = weekData[d]?.blocks || [];
          return blocks.some(b => b.id === tbEditBlock.id);
        });
        const editDayBlocks = editDayKey ? (weekData[editDayKey]?.blocks || []) : [];
        const editStudyConflict = tbEditType === 'study' && tbEditBlock.type !== 'study' && editDayBlocks.some(b => b.type === 'study' && b.id !== tbEditBlock.id);
        return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setTBEditBlock(null)}>
          <div className={styles.tbEditModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.tbEditTitle}>Edit Time Block</div>
            <div className={styles.tbEditField}>
              <label>Label</label>
              <input
                type="text"
                value={tbEditLabel}
                onChange={(e) => setTBEditLabel(e.target.value)}
                className={styles.tbFormInput}
                autoFocus
              />
            </div>
            <div className={styles.tbEditField}>
              <label>Type</label>
              <select
                value={tbEditType}
                onChange={(e) => setTBEditType(e.target.value as any)}
                className={styles.tbFormSelect}
              >
                <option value="study">Study</option>
                <option value="sleep">Sleep</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className={styles.tbEditRow}>
              <div className={styles.tbEditField}>
                <label>Start</label>
                <input
                  type="time"
                  value={tbEditStart}
                  onChange={(e) => setTBEditStart(e.target.value)}
                  className={styles.tbFormInput}
                />
              </div>
              <div className={styles.tbEditField}>
                <label>End</label>
                <input
                  type="time"
                  value={tbEditEnd}
                  onChange={(e) => setTBEditEnd(e.target.value)}
                  className={styles.tbFormInput}
                />
              </div>
            </div>
            <div className={styles.tbEditField}>
              <label>Color (optional)</label>
              <input
                type="color"
                value={tbEditColor || '#8b5cf6'}
                onChange={(e) => setTBEditColor(e.target.value)}
                className={styles.tbColorInput}
              />
            </div>
            {editStudyConflict && (
              <p style={{ color: 'var(--error, #ef4444)', fontSize: 12, margin: '0 0 8px' }}>
                This day already has a Study Block. Only one Study Block per day is allowed.
              </p>
            )}
            <div className={styles.tbEditActions}>
              <button className={styles.tbFormCancel} onClick={() => setTBEditBlock(null)}>Cancel</button>
              <button className={styles.tbFormSave} onClick={handleTBEditSave} disabled={!tbEditLabel.trim() || editStudyConflict}>Save</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Time Block delete confirm */}
      {tbDeleteConfirm && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setTBDeleteConfirm(null)}>
          <div className={styles.tbEditModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.tbEditTitle}>Delete Time Block</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 20px' }}>
              Delete "{tbDeleteConfirm.label}" ({formatHHMM(tbDeleteConfirm.start_time)}–{formatHHMM(tbDeleteConfirm.end_time)})? This cannot be undone.
            </p>
            <div className={styles.tbEditActions}>
              <button className={styles.tbFormCancel} onClick={() => setTBDeleteConfirm(null)}>Cancel</button>
              <button className={styles.tbDeleteBtn} onClick={handleTBDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
