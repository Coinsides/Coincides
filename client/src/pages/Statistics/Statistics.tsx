import { useEffect } from 'react';
import { useStatisticsStore } from '@/stores/statisticsStore';
import styles from './Statistics.module.css';

// --- Heatmap helpers ---

function getHeatmapColor(level: number): string {
  switch (level) {
    case 0: return 'var(--bg-elevated)';
    case 1: return 'rgba(99, 102, 241, 0.25)';
    case 2: return 'rgba(99, 102, 241, 0.45)';
    case 3: return 'rgba(99, 102, 241, 0.7)';
    case 4: return 'var(--accent-primary)';
    default: return 'var(--bg-elevated)';
  }
}

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  dow: number; // 0=Mon … 6=Sun
}

function buildHeatmapGrid(data: Array<{ date: string; count: number; level: number }>) {
  const map = new Map(data.map((d) => [d.date, d]));

  // Build 26 weeks (≈6 months) ending today
  const today = new Date();
  const weeks: HeatmapDay[][] = [];
  const monthLabels: { label: string; col: number }[] = [];

  // Find the Monday of the week 25 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // this Monday
  // if today is Sunday (getDay()===0), go back to previous Monday
  if (today.getDay() === 0) startDate.setDate(startDate.getDate() - 7);
  startDate.setDate(startDate.getDate() - 25 * 7);

  let prevMonth = -1;
  const cursor = new Date(startDate);

  for (let w = 0; w < 26; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const entry = map.get(dateStr);
      const month = cursor.getMonth();
      if (month !== prevMonth) {
        monthLabels.push({
          label: cursor.toLocaleString('en', { month: 'short' }),
          col: w,
        });
        prevMonth = month;
      }
      week.push({
        date: dateStr,
        count: entry?.count ?? 0,
        level: entry?.level ?? 0,
        dow: d,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return { weeks, monthLabels };
}

// --- Trend chart SVG ---

function TrendChart({ trends }: { trends: Array<{ period_label: string; completion_rate: number; tasks_completed: number; cards_reviewed: number }> }) {
  if (trends.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trend data yet</div>;

  const width = 600;
  const height = 200;
  const padLeft = 40;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = trends.map((t, i) => {
    const x = padLeft + (trends.length === 1 ? chartW / 2 : (i / (trends.length - 1)) * chartW);
    const y = padTop + chartH - (t.completion_rate / 100) * chartH;
    return { x, y, ...t };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${padLeft},${padTop + chartH} ${linePoints} ${points[points.length - 1].x},${padTop + chartH}`;

  const totalTasks = trends.reduce((s, t) => s + t.tasks_completed, 0);
  const totalCards = trends.reduce((s, t) => s + t.cards_reviewed, 0);

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }}>
        {/* Y-axis gridlines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padTop + chartH - (pct / 100) * chartH;
          return (
            <g key={pct}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="var(--border-subtle)" strokeWidth={1} />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={10}>{pct}%</text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="var(--accent-primary)" opacity={0.15} />

        {/* Line */}
        <polyline points={linePoints} fill="none" stroke="var(--accent-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--accent-primary)">
            <title>{p.period_label}: {p.completion_rate}%</title>
          </circle>
        ))}

        {/* X-axis labels (show every 2nd) */}
        {points.map((p, i) => (
          i % 2 === 0 ? (
            <text key={i} x={p.x} y={height - 6} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>
              {p.period_label}
            </text>
          ) : null
        ))}
      </svg>
      <div className={styles.trendSubtext}>
        {totalTasks} tasks completed · {totalCards} cards reviewed over {trends.length} weeks
      </div>
    </>
  );
}

// --- Main component ---

export default function StatisticsPage() {
  const { overview, heatmap, trends, courseStats, loading, fetchOverview, fetchHeatmap, fetchTrends, fetchCourseStats } = useStatisticsStore();

  useEffect(() => {
    fetchOverview();
    fetchHeatmap(6);
    fetchTrends('weekly', 12);
    fetchCourseStats();
  }, []);

  const { weeks, monthLabels } = buildHeatmapGrid(heatmap);

  if (loading && !overview) {
    return (
      <div className={styles.page}>
        <div className={styles.title}>Statistics</div>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.title}>Statistics</div>

      {/* Section 1: Overview Cards */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewLabel}>Current Streak</div>
          <div className={styles.overviewBig}>🔥 {overview?.streak.current ?? 0} days</div>
          <div className={styles.overviewSmall}>Longest: {overview?.streak.longest ?? 0} days</div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewLabel}>Today</div>
          <div className={styles.overviewStats}>
            {overview?.today.tasks_completed ?? 0}/{overview?.today.tasks_total ?? 0} tasks · {overview?.today.cards_reviewed ?? 0} cards
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewLabel}>This Week</div>
          <div className={styles.overviewStats}>
            {overview?.this_week.tasks_completed ?? 0}/{overview?.this_week.tasks_total ?? 0} tasks · {overview?.this_week.cards_reviewed ?? 0} cards
          </div>
        </div>
        <div className={styles.overviewCard}>
          <div className={styles.overviewLabel}>This Month</div>
          <div className={styles.overviewStats}>
            {overview?.this_month.tasks_completed ?? 0}/{overview?.this_month.tasks_total ?? 0} tasks · {overview?.this_month.cards_reviewed ?? 0} cards
          </div>
        </div>
      </div>

      {/* Section 2: Activity Heatmap */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Activity</div>
        <div className={styles.chartCard}>
          <div className={styles.heatmapWrap}>
            <div className={styles.heatmapLabels}>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className={styles.heatmapGrid}>
              <div className={styles.heatmapMonths}>
                {monthLabels.map((m, i) => (
                  <span
                    key={i}
                    className={styles.heatmapMonth}
                    style={{ marginLeft: i === 0 ? 0 : `${(m.col - (monthLabels[i - 1]?.col ?? 0)) * 14 - (i > 0 ? monthLabels[i - 1].label.length * 6 : 0)}px` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              <div className={styles.heatmapColumns}>
                {weeks.map((week, wi) => (
                  <div key={wi} className={styles.heatmapColumn}>
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={styles.heatmapCell}
                        style={{ backgroundColor: getHeatmapColor(day.level) }}
                        title={`${day.date}: ${day.count} activities`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Trend Chart */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Completion Rate (last 12 weeks)</div>
        <div className={styles.chartCard}>
          <TrendChart trends={trends} />
        </div>
      </div>

      {/* Section 4: Per-Course Breakdown */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Courses</div>
        {courseStats.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No course data yet</div>
        ) : (
          <div className={styles.courseGrid}>
            {courseStats.map((cs) => (
              <div key={cs.course_id} className={styles.courseCard}>
                <div className={styles.courseHeader}>
                  <span className={styles.courseDot} style={{ backgroundColor: cs.course_color }} />
                  <span className={styles.courseName}>{cs.course_name}</span>
                  <span className={styles.courseRate}>{Math.round(cs.completion_rate)}%</span>
                </div>
                <div className={styles.courseProgressBar}>
                  <div
                    className={styles.courseProgressFill}
                    style={{ width: `${cs.completion_rate}%`, backgroundColor: cs.course_color }}
                  />
                </div>
                <div className={styles.courseMeta}>
                  <span>{cs.tasks_completed}/{cs.tasks_total} tasks</span>
                  <span>{cs.cards_reviewed} cards</span>
                  <span>{cs.active_goals} goals</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
