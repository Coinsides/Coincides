import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
import { ChevronLeft, ChevronRight, X, Plus, Check, Sparkles, Edit3, Trash2, Clock, AlignLeft, CheckSquare, Target, Info } from 'lucide-react';
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

/** Convert 'HH:MM' to percentage position in a 24h column */
function timeStrToPercent(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return ((h + m / 60) / 24) * 100;
}

/** Convert 'HH:MM' to a display label like '9:00' */
function formatHHMM(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Snap a percentage (0-100) to 30-min grid */
function snapToGrid(pct: number): number {
  const minutes = (pct / 100) * 1440;
  const snapped = Math.round(minutes / 30) * 30;
  return Math.min(Math.max((snapped / 1440) * 100, 0), 100);
}

function pctToHHMM(pct: number): string {
  const totalMin = Math.round((pct / 100) * 1440);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Blend two hex colors (for overlap visualization) */
function blendColors(c1: string, c2: string): string {
  const parse = (c: string) => {
    const hex = c.replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [view, setView] = useState<CalendarView>('month');

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: Task } | null>(null);

  // Time Block drag-select state
  const [dragSelect, setDragSelect] = useState<{ dayIdx: number; startPct: number; currentPct: number } | null>(null);
  const [showTBForm, setShowTBForm] = useState<{ dayIdx: number; startTime: string; endTime: string } | null>(null);
  const [tbFormLabel, setTBFormLabel] = useState('');
  const [tbFormType, setTBFormType] = useState<'study' | 'sleep' | 'custom'>('study');
  const timedSectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { tasks, fetchTasksByRange, deleteTask } = useTaskStore();
  const courses = useCourseStore((s) => s.courses);
  const { goals, fetchGoals } = useGoalStore();
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);
  const { weekData, fetchWeek, createBlocks } = useTimeBlockStore();

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

  // Close context menu on any click
  useEffect(() => {
    const handler = () => setContextMenu(null);
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

  const getTimePosition = (timeStr: string): number => {
    const date = new Date(timeStr);
    const hours = date.getHours() + date.getMinutes() / 60;
    return (hours / 24) * 100;
  };

  const getBlockHeight = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return Math.max((durationHours / 24) * 100, 2.5); // min 2.5% so it's visible
  };

  const formatTimeRange = (start: string, end: string): string => {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  };

  // ── Time Block drag-select handlers ───────────────────────

  const handleTBMouseDown = useCallback((dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = snapToGrid(((e.clientY - rect.top) / rect.height) * 100);
    setDragSelect({ dayIdx, startPct: pct, currentPct: pct });
    e.preventDefault();
  }, []);

  const handleTBMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, dayIdx: number) => {
    if (!dragSelect || dragSelect.dayIdx !== dayIdx) return;
    const ref = timedSectionRefs.current[dayIdx];
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const pct = snapToGrid(((e.clientY - rect.top) / rect.height) * 100);
    setDragSelect((prev) => prev ? { ...prev, currentPct: pct } : null);
  }, [dragSelect]);

  const handleTBMouseUp = useCallback(() => {
    if (!dragSelect) return;
    const topPct = Math.min(dragSelect.startPct, dragSelect.currentPct);
    const botPct = Math.max(dragSelect.startPct, dragSelect.currentPct);
    if (botPct - topPct < 1) {
      setDragSelect(null);
      return;
    }
    setShowTBForm({
      dayIdx: dragSelect.dayIdx,
      startTime: pctToHHMM(topPct),
      endTime: pctToHHMM(botPct),
    });
    setTBFormLabel('');
    setTBFormType('study');
    setDragSelect(null);
  }, [dragSelect]);

  // Global mouseup to end drag
  useEffect(() => {
    const handler = () => {
      if (dragSelect) handleTBMouseUp();
    };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [dragSelect, handleTBMouseUp]);

  const handleTBFormSubmit = async () => {
    if (!showTBForm || !tbFormLabel.trim()) return;
    const day = weekDays[showTBForm.dayIdx];
    const dayOfWeek = day.getDay(); // 0=Sun
    try {
      await createBlocks([{
        label: tbFormLabel.trim(),
        type: tbFormType as any,
        day_of_week: dayOfWeek,
        start_time: showTBForm.startTime,
        end_time: showTBForm.endTime,
      }]);
      // Refresh week data
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      fetchWeek(format(weekStart, 'yyyy-MM-dd'));
      setShowTBForm(null);
      addToast('success', 'Time block created');
    } catch {
      addToast('error', 'Failed to create time block');
    }
  };

  // Build overlap map for a given day's resolved blocks
  const getOverlapSegments = (blocks: ResolvedTimeBlock[], overlaps: [string, string][]) => {
    const segments: Array<{ top: number; height: number; color: string }> = [];
    for (const [id1, id2] of overlaps) {
      const b1 = blocks.find((b) => b.id === id1);
      const b2 = blocks.find((b) => b.id === id2);
      if (!b1 || !b2) continue;
      const start = Math.max(timeStrToPercent(b1.start_time), timeStrToPercent(b2.start_time));
      const end = Math.min(timeStrToPercent(b1.end_time), timeStrToPercent(b2.end_time));
      if (end > start) {
        segments.push({
          top: start,
          height: end - start,
          color: blendColors(getTBColor(b1), getTBColor(b2)),
        });
      }
    }
    return segments;
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
          {weekDays.map((day, dayIdx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTaskList = tasksByDate[dateStr] || [];
            const selected = selectedDate && isSameDay(day, selectedDate);
            const allDayTasks = dayTaskList.filter((t) => !t.start_time || !t.end_time);
            const timedTasks = dayTaskList.filter((t) => t.start_time && t.end_time);
            const dayBlocks = weekData[dateStr];
            const resolvedBlocks = dayBlocks?.blocks || [];
            const dayOverlaps = dayBlocks?.overlaps || [];
            const overlapSegments = getOverlapSegments(resolvedBlocks, dayOverlaps);

            // Drag-select preview for this column
            const isDraggingHere = dragSelect?.dayIdx === dayIdx;
            const dragTop = isDraggingHere ? Math.min(dragSelect!.startPct, dragSelect!.currentPct) : 0;
            const dragHeight = isDraggingHere ? Math.abs(dragSelect!.currentPct - dragSelect!.startPct) : 0;

            return (
              <div
                key={dateStr}
                className={`${styles.weekColumn} ${isToday(day) ? styles.weekColumnToday : ''} ${selected ? styles.weekColumnSelected : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <div className={styles.weekColumnHeader}>
                  <span className={styles.weekColumnDay}>{format(day, 'EEE')}</span>
                  <span className={`${styles.weekColumnDate} ${isToday(day) ? styles.weekColumnDateToday : ''}`}>{format(day, 'd')}</span>
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
                  onMouseDown={(e) => handleTBMouseDown(dayIdx, e)}
                  onMouseMove={(e) => handleTBMouseMove(e, dayIdx)}
                >
                  {/* Time Block background layer */}
                  {resolvedBlocks.map((block) => {
                    const top = timeStrToPercent(block.start_time);
                    const height = timeStrToPercent(block.end_time) - top;
                    const color = getTBColor(block);
                    return (
                      <div
                        key={`tb-${block.id}`}
                        className={styles.tbBackground}
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          backgroundColor: color + '25',
                          borderLeft: `3px solid ${color}55`,
                        }}
                        title={`${block.label} (${formatHHMM(block.start_time)}–${formatHHMM(block.end_time)})`}
                      >
                        <span className={styles.tbLabel}>{block.label}</span>
                      </div>
                    );
                  })}

                  {/* Overlap blended segments + info icon */}
                  {overlapSegments.map((seg, i) => (
                    <div
                      key={`overlap-${i}`}
                      className={styles.tbOverlap}
                      style={{
                        top: `${seg.top}%`,
                        height: `${seg.height}%`,
                        backgroundColor: seg.color + '35',
                      }}
                    >
                      <Info size={12} className={styles.tbOverlapIcon} />
                    </div>
                  ))}

                  {/* Drag-select preview */}
                  {isDraggingHere && dragHeight > 0 && (
                    <div
                      className={styles.tbDragPreview}
                      style={{ top: `${dragTop}%`, height: `${dragHeight}%` }}
                    >
                      <span className={styles.tbDragLabel}>
                        {pctToHHMM(dragTop)} – {pctToHHMM(dragTop + dragHeight)}
                      </span>
                    </div>
                  )}

                  {/* Time Block creation mini-form */}
                  {showTBForm && showTBForm.dayIdx === dayIdx && (
                    <div
                      className={styles.tbFormPopup}
                      style={{ top: `${timeStrToPercent(showTBForm.startTime)}%` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        className={styles.tbFormInput}
                        placeholder="Label (e.g. Study)"
                        value={tbFormLabel}
                        onChange={(e) => setTBFormLabel(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTBFormSubmit(); if (e.key === 'Escape') setShowTBForm(null); }}
                      />
                      <select
                        className={styles.tbFormSelect}
                        value={tbFormType}
                        onChange={(e) => setTBFormType(e.target.value as any)}
                      >
                        <option value="study">Study</option>
                        <option value="sleep">Sleep</option>
                        <option value="custom">Custom</option>
                      </select>
                      <div className={styles.tbFormTime}>
                        {formatHHMM(showTBForm.startTime)} – {formatHHMM(showTBForm.endTime)}
                      </div>
                      <div className={styles.tbFormActions}>
                        <button className={styles.tbFormCancel} onClick={() => setShowTBForm(null)}>Cancel</button>
                        <button className={styles.tbFormSave} onClick={handleTBFormSubmit} disabled={!tbFormLabel.trim()}>Save</button>
                      </div>
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
                            {course && (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: courseColor + '18', color: courseColor, fontWeight: 500, flexShrink: 0 }}>
                                {course.code || course.name}
                              </span>
                            )}
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
    </div>
  );
}
