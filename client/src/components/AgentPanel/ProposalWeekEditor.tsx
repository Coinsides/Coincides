/**
 * ProposalWeekEditor — A mini week-view editor for time_block_setup proposals.
 * Shows the date range from the proposal items, lets users drag-select to add
 * time blocks, right-click to edit/delete, with dates outside the range greyed out.
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Edit3 } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import styles from './ProposalWeekEditor.module.css';

const TB_TYPE_OPTIONS = [
  { value: 'study', label: 'Study', color: '#6366f1' },
  { value: 'rest', label: 'Rest', color: '#f59e0b' },
  { value: 'meal', label: 'Meal', color: '#22c55e' },
  { value: 'exercise', label: 'Exercise', color: '#ec4899' },
];

const BLOCK_COLORS: Record<string, string> = {
  study: '#6366f1', rest: '#f59e0b', meal: '#22c55e', exercise: '#ec4899', custom: '#94a3b8',
};

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6:00 to 20:00
const RANGE_START = 6;
const RANGE_END = 21;

interface TimeBlockItem {
  label: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  color?: string;
}

interface Props {
  items: TimeBlockItem[];
  allowedDates: string[]; // Dates user selected for study
  onSave: (items: TimeBlockItem[]) => void;
  onClose: () => void;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function pctToTime(pct: number): string {
  const totalMin = (RANGE_END - RANGE_START) * 60;
  const min = Math.round((pct / 100) * totalMin / 30) * 30; // Snap to 30min
  return minutesToTime(RANGE_START * 60 + min);
}

export default function ProposalWeekEditor({ items: initialItems, allowedDates, onSave, onClose }: Props) {
  const [localItems, setLocalItems] = useState<TimeBlockItem[]>(initialItems);
  const allowedSet = useMemo(() => new Set(allowedDates), [allowedDates]);

  // Compute the week(s) to display — cover all allowed dates, snap to weeks
  const weekDays = useMemo(() => {
    if (allowedDates.length === 0) return [];
    const sorted = [...allowedDates].sort();
    const firstDate = new Date(sorted[0] + 'T00:00:00');
    const lastDate = new Date(sorted[sorted.length - 1] + 'T00:00:00');
    const weekStart = startOfWeek(firstDate, { weekStartsOn: 1 });
    
    const days: Date[] = [];
    let cur = new Date(weekStart);
    // Show complete weeks covering the range
    while (cur <= lastDate || days.length % 7 !== 0) {
      days.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return days;
  }, [allowedDates]);

  // Drag state
  const [dragState, setDragState] = useState<{ dayIdx: number; startPct: number; currentPct: number } | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Edit form
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState<{ date: string; start_time: string; end_time: string } | null>(null);
  const [formType, setFormType] = useState('study');

  const handleMouseDown = useCallback((dayIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    const dateStr = format(weekDays[dayIdx], 'yyyy-MM-dd');
    if (!allowedSet.has(dateStr)) return; // Can't edit non-allowed dates
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDragState({ dayIdx, startPct: pct, currentPct: pct });
    e.preventDefault();
  }, [weekDays, allowedSet]);

  const handleMouseMove = useCallback((e: React.MouseEvent, dayIdx: number) => {
    if (!dragState || dragState.dayIdx !== dayIdx) return;
    const ref = columnRefs.current[dayIdx];
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDragState(prev => prev ? { ...prev, currentPct: pct } : null);
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;
    const topPct = Math.min(dragState.startPct, dragState.currentPct);
    const botPct = Math.max(dragState.startPct, dragState.currentPct);
    if (botPct - topPct < 3) { setDragState(null); return; }

    const startTime = pctToTime(topPct);
    const endTime = pctToTime(botPct);
    const dateStr = format(weekDays[dragState.dayIdx], 'yyyy-MM-dd');

    setShowAddForm({ date: dateStr, start_time: startTime, end_time: endTime });
    setFormType('study');
    setDragState(null);
  }, [dragState, weekDays]);

  useEffect(() => {
    const handler = () => { if (dragState) handleMouseUp(); };
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, [dragState, handleMouseUp]);

  const handleAddConfirm = useCallback(() => {
    if (!showAddForm) return;
    setLocalItems(prev => [...prev, {
      label: formType,
      type: formType,
      date: showAddForm.date,
      start_time: showAddForm.start_time,
      end_time: showAddForm.end_time,
    }]);
    setShowAddForm(null);
  }, [showAddForm, formType]);

  const handleDeleteItem = useCallback((idx: number) => {
    setLocalItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localItems);
  }, [localItems, onSave]);

  const totalHeight = HOURS.length * 36; // 36px per hour

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>编辑 Time Block</h3>
          <span className={styles.hint}>在允许的日期上拖拽创建 Time Block</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.grid}>
          {/* Time gutter */}
          <div className={styles.timeGutter}>
            {HOURS.map(h => (
              <div key={h} className={styles.hourLabel} style={{ height: 36 }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIdx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isAllowed = allowedSet.has(dateStr);
            const dayItems = localItems.filter(item => item.date === dateStr);

            return (
              <div key={dateStr} className={styles.dayColumn}>
                <div className={`${styles.dayHeader} ${isAllowed ? styles.dayAllowed : styles.dayDisabled}`}>
                  <span className={styles.dayName}>{format(day, 'EEE')}</span>
                  <span className={styles.dayDate}>{format(day, 'M/d')}</span>
                </div>
                <div
                  ref={el => { columnRefs.current[dayIdx] = el; }}
                  className={`${styles.dayBody} ${!isAllowed ? styles.dayBodyDisabled : ''}`}
                  style={{ height: totalHeight }}
                  onMouseDown={(e) => handleMouseDown(dayIdx, e)}
                  onMouseMove={(e) => handleMouseMove(e, dayIdx)}
                >
                  {/* Hour gridlines */}
                  {HOURS.map(h => (
                    <div key={h} className={styles.gridLine} style={{ top: (h - RANGE_START) * 36 }} />
                  ))}

                  {/* Existing blocks */}
                  {dayItems.map((item, i) => {
                    const globalIdx = localItems.indexOf(item);
                    const startMin = timeToMinutes(item.start_time);
                    const endMin = timeToMinutes(item.end_time);
                    const top = ((startMin - RANGE_START * 60) / ((RANGE_END - RANGE_START) * 60)) * totalHeight;
                    const height = ((endMin - startMin) / ((RANGE_END - RANGE_START) * 60)) * totalHeight;
                    const color = BLOCK_COLORS[item.type] || BLOCK_COLORS.custom;

                    return (
                      <div
                        key={i}
                        className={styles.block}
                        style={{
                          top: Math.max(0, top),
                          height: Math.max(16, height),
                          background: `${color}30`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <span className={styles.blockLabel}>{item.type}</span>
                        <span className={styles.blockTime}>{item.start_time}–{item.end_time}</span>
                        {isAllowed && (
                          <button className={styles.blockDelete} onClick={() => handleDeleteItem(globalIdx)}>
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Drag preview */}
                  {dragState && dragState.dayIdx === dayIdx && (() => {
                    const topPct = Math.min(dragState.startPct, dragState.currentPct);
                    const botPct = Math.max(dragState.startPct, dragState.currentPct);
                    return (
                      <div
                        className={styles.dragPreview}
                        style={{ top: `${topPct}%`, height: `${botPct - topPct}%` }}
                      />
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick add form after drag */}
        {showAddForm && (
          <div className={styles.addForm}>
            <span className={styles.addFormDate}>{showAddForm.date}</span>
            <span className={styles.addFormTime}>{showAddForm.start_time} – {showAddForm.end_time}</span>
            <div className={styles.typeButtons}>
              {TB_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.typeBtn} ${formType === opt.value ? styles.typeBtnActive : ''}`}
                  onClick={() => setFormType(opt.value)}
                >
                  <span className={styles.typeDot} style={{ background: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
            <div className={styles.addFormActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddForm(null)}>取消</button>
              <button className={styles.confirmBtn} onClick={handleAddConfirm}>添加</button>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.footerCount}>{localItems.length} 个 Time Block</span>
          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>取消</button>
            <button className={styles.saveBtn} onClick={handleSave}>保存到 Proposal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
