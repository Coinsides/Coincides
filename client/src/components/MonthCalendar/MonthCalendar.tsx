import { useState, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './MonthCalendar.module.css';

interface MonthCalendarProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  minDate?: string;   // YYYY-MM-DD, default today
  maxDate?: string;    // YYYY-MM-DD, default today + 90 days
}

/** Format Date → YYYY-MM-DD (local timezone). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD string to Date (local timezone midnight). */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Get today's date string. */
function todayStr(): string {
  return toDateStr(new Date());
}

/** Get date string N days from today. */
function futureDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Build array of day cells for a given year/month (includes leading/trailing from adjacent months). */
function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun

  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

  // Leading days from previous month
  if (startDow > 0) {
    const prevLast = new Date(year, month, 0);
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: toDateStr(d), day: d.getDate(), inMonth: false });
    }
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    cells.push({ date: toDateStr(dt), day: d, inMonth: true });
  }

  // Trailing days to fill 6 rows (42 cells) or at least complete the last week
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({ date: toDateStr(d), day: d.getDate(), inMonth: false });
  }

  return cells;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function MonthCalendar({
  selectedDates,
  onDatesChange,
  minDate,
  maxDate,
}: MonthCalendarProps) {
  const effectiveMin = minDate || todayStr();
  const effectiveMax = maxDate || futureDateStr(90);

  // Current view month
  const [viewYear, setViewYear] = useState(() => {
    const today = new Date();
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const today = new Date();
    return today.getMonth();
  });

  // Drag state
  const dragStartRef = useRef<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const isDragging = useRef(false);

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const cells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const isDisabled = useCallback(
    (dateStr: string) => dateStr < effectiveMin || dateStr > effectiveMax,
    [effectiveMin, effectiveMax],
  );

  // Compute the drag range preview
  const dragRange = useMemo(() => {
    if (!dragStartRef.current || !dragEnd) return new Set<string>();
    const a = dragStartRef.current;
    const b = dragEnd;
    const start = a < b ? a : b;
    const end = a < b ? b : a;
    const range = new Set<string>();
    const cur = parseDate(start);
    const endD = parseDate(end);
    while (cur <= endD) {
      const s = toDateStr(cur);
      if (!isDisabled(s)) range.add(s);
      cur.setDate(cur.getDate() + 1);
    }
    return range;
  }, [dragEnd, isDisabled]);

  // Navigation
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // Mouse handlers for drag-select
  const handleMouseDown = useCallback(
    (dateStr: string) => {
      if (isDisabled(dateStr)) return;
      dragStartRef.current = dateStr;
      setDragEnd(dateStr);
      isDragging.current = true;
    },
    [isDisabled],
  );

  const handleMouseEnter = useCallback(
    (dateStr: string) => {
      if (!isDragging.current || isDisabled(dateStr)) return;
      setDragEnd(dateStr);
    },
    [isDisabled],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current || !dragStartRef.current) return;
    isDragging.current = false;

    const start = dragStartRef.current;
    const end = dragEnd || start;
    const rangeStart = start < end ? start : end;
    const rangeEnd = start < end ? end : start;

    // If single-click (start === end), toggle that date
    if (rangeStart === rangeEnd) {
      if (selectedSet.has(rangeStart)) {
        onDatesChange(selectedDates.filter((d) => d !== rangeStart));
      } else {
        const next = [...selectedDates, rangeStart].sort();
        onDatesChange(next);
      }
    } else {
      // Drag: set selection to this range (replacing previous selection)
      const newDates: string[] = [];
      const cur = parseDate(rangeStart);
      const endD = parseDate(rangeEnd);
      while (cur <= endD) {
        const s = toDateStr(cur);
        if (!isDisabled(s)) newDates.push(s);
        cur.setDate(cur.getDate() + 1);
      }
      onDatesChange(newDates);
    }

    dragStartRef.current = null;
    setDragEnd(null);
  }, [dragEnd, selectedDates, selectedSet, onDatesChange, isDisabled]);

  // Summary text
  const summaryText = useMemo(() => {
    if (selectedDates.length === 0) return '请选择日期（拖选连续范围，或单击选择）';
    if (selectedDates.length === 1) {
      return `已选 1 天：${selectedDates[0]}`;
    }
    // Check if continuous
    const sorted = [...selectedDates].sort();
    let continuous = true;
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseDate(sorted[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (toDateStr(prev) !== sorted[i]) {
        continuous = false;
        break;
      }
    }
    if (continuous) {
      return `已选 ${sorted.length} 天：${sorted[0]} 至 ${sorted[sorted.length - 1]}`;
    }
    return `已选 ${sorted.length} 天`;
  }, [selectedDates]);

  return (
    <div
      className={styles.container}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header: month navigation */}
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={goToPrevMonth} type="button">
          <ChevronLeft size={16} />
        </button>
        <span className={styles.monthLabel}>
          {viewYear}年 {viewMonth + 1}月
        </span>
        <button className={styles.navBtn} onClick={goToNextMonth} type="button">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles.weekdayCell}>
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className={styles.grid}>
        {cells.map((cell) => {
          const disabled = isDisabled(cell.date);
          const selected = selectedSet.has(cell.date);
          const inDragRange = dragRange.has(cell.date);

          const classNames = [
            styles.dayCell,
            !cell.inMonth ? styles.outsideMonth : '',
            disabled ? styles.disabled : '',
            selected && !inDragRange ? styles.selected : '',
            inDragRange ? styles.dragPreview : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={cell.date}
              className={classNames}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(cell.date);
              }}
              onMouseEnter={() => handleMouseEnter(cell.date)}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className={styles.summary}>{summaryText}</div>
    </div>
  );
}
