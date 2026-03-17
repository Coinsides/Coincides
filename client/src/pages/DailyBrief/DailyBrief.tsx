import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Check, ChevronDown, Zap, Battery, BatteryLow, BarChart3 } from 'lucide-react';
import { useDailyBriefStore } from '@/stores/dailyBriefStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import { EnergyLevel } from '@shared/types';
import type { Task } from '@shared/types';
import styles from './DailyBrief.module.css';

const energyOptions: { value: EnergyLevel; label: string; icon: typeof Zap }[] = [
  { value: EnergyLevel.Energized, label: 'Energized', icon: Zap },
  { value: EnergyLevel.Normal, label: 'Normal', icon: Battery },
  { value: EnergyLevel.Tired, label: 'Tired', icon: BatteryLow },
];

const priorityConfig = {
  must: { label: 'Must', color: 'var(--priority-must)', defaultOpen: true },
  recommended: { label: 'Recommended', color: 'var(--priority-recommended)', defaultOpen: false },
  optional: { label: 'Optional', color: 'var(--priority-optional)', defaultOpen: false },
} as const;

export default function DailyBrief() {
  const { briefData, loading, fetchDailyBrief, setDailyStatus, updateTaskInBrief } = useDailyBriefStore();
  const courses = useCourseStore((s) => s.courses);
  const addToast = useUIStore((s) => s.addToast);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    must: true,
    recommended: false,
    optional: false,
  });

  useEffect(() => {
    fetchDailyBrief();
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const { data } = await api.put(`/tasks/${task.id}`, { status: newStatus });
      updateTaskInBrief(data);
    } catch {
      addToast('error', 'Failed to update task');
    }
  };

  const today = new Date();
  const dateStr = format(today, 'EEEE, MMMM d');
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading && !briefData) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.date}>{dateStr}</div>
        <div className={styles.greeting}>{greeting}. Here's your study plan for today.</div>
      </div>

      {/* Energy level */}
      <div className={styles.energySection}>
        <div className={styles.sectionTitle}>How are you feeling?</div>
        <div className={styles.energyButtons}>
          {energyOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`${styles.energyBtn} ${briefData?.energy_level === value ? styles.active : ''}`}
              onClick={() => setDailyStatus(value)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task sections */}
      {(['must', 'recommended', 'optional'] as const).map((priority) => {
        const config = priorityConfig[priority];
        const tasks = briefData?.tasks[priority] || [];
        const isOpen = openSections[priority];
        const completedCount = tasks.filter((t) => t.status === 'completed').length;

        return (
          <div key={priority} className={styles.taskSection}>
            <div className={styles.sectionHeader} onClick={() => toggleSection(priority)}>
              <div className={styles.sectionHeaderLeft}>
                <span className={styles.priorityDot} style={{ backgroundColor: config.color }} />
                <span className={styles.sectionName}>{config.label}</span>
                <span className={styles.badge}>
                  {completedCount}/{tasks.length}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
              />
            </div>

            {isOpen && (
              <div className={styles.taskList}>
                {tasks.length === 0 ? (
                  <div className={styles.emptyTasks}>No {config.label.toLowerCase()} tasks for today</div>
                ) : (
                  tasks.map((task) => {
                    const course = getCourse(task.course_id);
                    return (
                      <div key={task.id} className={styles.taskItem}>
                        <button
                          className={`${styles.checkbox} ${task.status === 'completed' ? styles.checked : ''}`}
                          onClick={() => toggleTask(task)}
                        >
                          {task.status === 'completed' && <Check size={12} color="white" />}
                        </button>
                        <span
                          className={`${styles.taskTitle} ${task.status === 'completed' ? styles.completed : ''}`}
                        >
                          {task.title}
                        </span>
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
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Recurring task alerts */}
      {briefData && briefData.recurring_alerts.length > 0 && (
        <div className={styles.alertsSection}>
          <div className={styles.sectionTitle}>Recurring Task Alerts</div>
          {briefData.recurring_alerts.map((alert) => (
            <div key={alert.group_id} className={styles.alertCard}>
              <BarChart3 size={16} className={styles.alertIcon} style={{ color: 'var(--warning)' }} />
              <div className={styles.alertText}>
                <strong>{alert.title}</strong> — {alert.completed_tasks}/{alert.total_tasks} completed
                ({alert.days_behind} behind schedule)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards due placeholder */}
      <div className={styles.cardsPlaceholder}>
        No cards due for review
      </div>
    </div>
  );
}
