import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Zap, Battery, BatteryLow, BarChart3, Play, Clock, CheckSquare, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDailyBriefStore } from '@/stores/dailyBriefStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import { EnergyLevel } from '@shared/types';
import type { Task, ResolvedTimeBlock } from '@shared/types';
import styles from './DailyBrief.module.css';

const energyOptions: { value: EnergyLevel; label: string; icon: typeof Zap }[] = [
  { value: EnergyLevel.Energized, label: 'Energized', icon: Zap },
  { value: EnergyLevel.Normal, label: 'Normal', icon: Battery },
  { value: EnergyLevel.Tired, label: 'Tired', icon: BatteryLow },
];

const priorityConfig = {
  must: { label: 'Must Do', color: 'var(--priority-must)', defaultOpen: true },
  recommended: { label: 'Recommended', color: 'var(--priority-recommended)', defaultOpen: false },
  optional: { label: 'Optional', color: 'var(--priority-optional)', defaultOpen: false },
} as const;

const formatTimeRange = (start: string, end: string): string => {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
};

export default function DailyBrief() {
  const { briefData, loading, fetchDailyBrief, setDailyStatus, updateTaskInBrief } = useDailyBriefStore();
  const courses = useCourseStore((s) => s.courses);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    } catch (err) {
      console.error('Failed to load daily brief:', err);
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
        <div className={styles.greeting}>{greeting}</div>
      </div>

      {/* Time Block overview — only shown when user has blocks (§2: never prompt to set up) */}
      {briefData && briefData.time_blocks && briefData.time_blocks.length > 0 && (
        <div className={styles.timeBlockOverview}>
          <div className={styles.timeBlockTitle}>
            <Clock size={14} />
            {t('dailyBriefPage.studySchedule', "Today's Study Schedule")}
          </div>
          <div className={styles.timeBlockList}>
            {briefData.time_blocks
              .filter((b: ResolvedTimeBlock) => b.type === 'study')
              .sort((a: ResolvedTimeBlock, b: ResolvedTimeBlock) => a.start_time.localeCompare(b.start_time))
              .map((block: ResolvedTimeBlock) => (
                <div key={block.id} className={styles.timeBlockChip}>
                  <span className={styles.timeBlockTime}>{block.start_time} – {block.end_time}</span>
                  <span className={styles.timeBlockLabel}>{block.label}</span>
                </div>
              ))}
            {briefData.time_blocks.filter((b: ResolvedTimeBlock) => b.type === 'study').length === 0 && (
              <span className={styles.timeBlockEmpty}>{t('dailyBriefPage.noStudyBlocks', 'No study blocks today')}</span>
            )}
          </div>
        </div>
      )}

      {/* Minimum Working Flow card */}
      {briefData?.minimum_working_flow && (
        <div className={styles.mwfCard}>
          <div className={styles.mwfTitle}>Today's Minimum</div>
          <div className={styles.mwfPills}>
            <span className={styles.mwfPill}>🎯 {briefData.minimum_working_flow.must_tasks_count} Must tasks</span>
            <span className={styles.mwfPill}>📚 {briefData.minimum_working_flow.cards_due_count} cards to review</span>

          </div>
          {briefData.minimum_working_flow.exam_mode_active && (
            <div className={styles.mwfExamWarning}>
              ⚡ Exam Mode active for {briefData.minimum_working_flow.exam_courses.map((c) => c.course_name).join(', ')}
            </div>
          )}
        </div>
      )}

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
          <div key={priority} className={styles.taskSection} style={{ borderLeftColor: config.color }}>
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
                    const checklistDone = task.checklist?.filter((c) => c.done).length ?? 0;
                    const checklistTotal = task.checklist?.length ?? 0;
                    return (
                      <div key={task.id} className={styles.taskItem}>
                        <button
                          className={`${styles.checkbox} ${task.status === 'completed' ? styles.checked : ''}`}
                          onClick={() => toggleTask(task)}
                        >
                          {task.status === 'completed' && <Check size={12} color="white" />}
                        </button>
                        <div className={styles.taskInfo}>
                          <span
                            className={`${styles.taskTitle} ${task.status === 'completed' ? styles.completed : ''}`}
                          >
                            {task.exam_boost && <span className={styles.examBoost}>⚡</span>}
                            {task.title}
                          </span>
                          {task.serves_must && priority !== 'must' && (
                            <div className={styles.servesMust}>
                              <ArrowRight size={10} />
                              {task.serves_must}
                            </div>
                          )}
                          {task.description && (
                            <div className={styles.taskDescription}>
                              {task.description.split('\n')[0].slice(0, 80)}
                            </div>
                          )}
                          {(task.start_time || checklistTotal > 0) && (
                            <div className={styles.taskTime}>
                              {task.start_time && task.end_time && (
                                <>
                                  <Clock size={10} />
                                  {formatTimeRange(task.start_time, task.end_time)}
                                </>
                              )}
                              {checklistTotal > 0 && (
                                <span className={styles.checklistMini}>
                                  <CheckSquare size={10} />
                                  {checklistDone}/{checklistTotal} items
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards due */}
      <div className={styles.cardsPlaceholder}>
        {briefData && briefData.cards_due_count > 0 ? (
          <div className={styles.cardsDue}>
            <span>{briefData.cards_due_count} card{briefData.cards_due_count !== 1 ? 's' : ''} due for review</span>
            <button className={styles.reviewLinkBtn} onClick={() => navigate('/review')}>
              <Play size={14} />
              Start Review
            </button>
          </div>
        ) : (
          'All caught up! No cards due for review'
        )}
      </div>
    </div>
  );
}
