import { useEffect, useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, X, Plus, Check, Sparkles } from 'lucide-react';
import { useTaskStore } from '@/stores/taskStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import type { Task } from '@shared/types';
import styles from './Calendar.module.css';

type CalendarView = 'month' | 'week';

const PRIORITY_COLORS: Record<string, string> = {
  must: 'var(--priority-must)',
  recommended: 'var(--priority-recommended)',
  optional: 'var(--priority-optional)',
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [view, setView] = useState<CalendarView>('month');

  const { tasks, fetchTasksByRange } = useTaskStore();
  const courses = useCourseStore((s) => s.courses);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);

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

  const handleDayClick = async (date: Date) => {
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const { data } = await api.get('/tasks', { params: { date: dateStr } });
      setDayTasks(data);
    } catch {
      setDayTasks([]);
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { status: newStatus });
      setDayTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch {
      addToast('error', 'Failed to update task');
    }
  };

  const getCourse = (id: string) => courses.find((c) => c.id === id);

  const groupedDayTasks = useMemo(() => {
    const groups = { must: [] as Task[], recommended: [] as Task[], optional: [] as Task[] };
    for (const t of dayTasks) {
      const p = t.priority as keyof typeof groups;
      if (groups[p]) groups[p].push(t);
    }
    return groups;
  }, [dayTasks]);

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
                        style={{ backgroundColor: PRIORITY_COLORS[t.priority] || 'var(--text-muted)' }}
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
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTaskList = tasksByDate[dateStr] || [];
            const selected = selectedDate && isSameDay(day, selectedDate);

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
                <div className={styles.weekColumnTasks}>
                  {dayTaskList.map((t) => {
                    const course = getCourse(t.course_id);
                    return (
                      <div
                        key={t.id}
                        className={`${styles.weekTask} ${t.status === 'completed' ? styles.weekTaskDone : ''}`}
                        style={{ borderLeftColor: PRIORITY_COLORS[t.priority] || 'var(--text-muted)' }}
                      >
                        <span className={styles.weekTaskTitle}>{t.title}</span>
                        {course && <span className={styles.weekTaskCourse} style={{ color: course.color }}>{course.code || course.name}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
                        return (
                          <div key={task.id} className={styles.detailTaskItem}>
                            <button
                              className={`${styles.checkbox} ${task.status === 'completed' ? styles.checked : ''}`}
                              onClick={() => toggleTask(task)}
                              style={{ width: 18, height: 18, border: `2px solid var(--border-default)`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: task.status === 'completed' ? 'var(--accent-primary)' : 'transparent', borderColor: task.status === 'completed' ? 'var(--accent-primary)' : undefined }}
                            >
                              {task.status === 'completed' && <Check size={12} color="white" />}
                            </button>
                            <span style={{ flex: 1, fontSize: 13, color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                              {task.title}
                            </span>
                            {course && (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: course.color + '18', color: course.color, fontWeight: 500 }}>
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
