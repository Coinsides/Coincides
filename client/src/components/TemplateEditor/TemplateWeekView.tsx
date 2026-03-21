import { useState, useCallback } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import type { TimeBlockTemplate } from '@shared/types';
import styles from './TemplateWeekView.module.css';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
// Map display index (0=Mon..6=Sun) to day_of_week (0=Sun..6=Sat)
const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0];
const DOW_TO_DISPLAY: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

// Hours to show (6am to 23pm)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

interface TemplateWeekViewProps {
  items: TimeBlockTemplate[];
  onAdd: (item: { label: string; type: string; day_of_week: number; start_time: string; end_time: string; color?: string }) => void;
  onEdit: (id: string, item: { label: string; type: string; start_time: string; end_time: string; color?: string }) => void;
  onDelete: (id: string) => void;
}

function timeToY(time: string, hourHeight: number, startHour: number): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - startHour) * 60 + m) * (hourHeight / 60);
}

function blockHeight(start: string, end: string, hourHeight: number): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(((eh * 60 + em) - (sh * 60 + sm)) * (hourHeight / 60), 20);
}

const BLOCK_COLORS: Record<string, string> = {
  study: 'rgba(99, 102, 241, 0.25)',
  rest: 'rgba(245, 158, 11, 0.2)',
  meal: 'rgba(34, 197, 94, 0.2)',
  exercise: 'rgba(236, 72, 153, 0.2)',
  custom: 'rgba(148, 163, 184, 0.2)',
};

const BLOCK_BORDERS: Record<string, string> = {
  study: '#6366f1',
  rest: '#f59e0b',
  meal: '#22c55e',
  exercise: '#ec4899',
  custom: '#94a3b8',
};

export default function TemplateWeekView({ items, onAdd, onEdit, onDelete }: TemplateWeekViewProps) {
  const hourHeight = 48; // px per hour
  const startHour = HOURS[0];

  const [editingItem, setEditingItem] = useState<TimeBlockTemplate | null>(null);
  const [showAddForm, setShowAddForm] = useState<{ dayIdx: number } | null>(null);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState('study');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('18:00');

  const openAddForm = useCallback((dayIdx: number) => {
    setEditingItem(null);
    setFormLabel('学习');
    setFormType('study');
    setFormStart('09:00');
    setFormEnd('18:00');
    setShowAddForm({ dayIdx });
  }, []);

  const openEditForm = useCallback((item: TimeBlockTemplate) => {
    setShowAddForm(null);
    setFormLabel(item.label);
    setFormType(item.type);
    setFormStart(item.start_time);
    setFormEnd(item.end_time);
    setEditingItem(item);
  }, []);

  const handleSubmitAdd = useCallback(() => {
    if (!showAddForm || !formLabel.trim()) return;
    onAdd({
      label: formLabel.trim(),
      type: formType,
      day_of_week: DISPLAY_TO_DOW[showAddForm.dayIdx],
      start_time: formStart,
      end_time: formEnd,
    });
    setShowAddForm(null);
  }, [showAddForm, formLabel, formType, formStart, formEnd, onAdd]);

  const handleSubmitEdit = useCallback(() => {
    if (!editingItem || !formLabel.trim()) return;
    onEdit(editingItem.id, {
      label: formLabel.trim(),
      type: formType,
      start_time: formStart,
      end_time: formEnd,
    });
    setEditingItem(null);
  }, [editingItem, formLabel, formType, formStart, formEnd, onEdit]);

  const handleCancelForm = useCallback(() => {
    setShowAddForm(null);
    setEditingItem(null);
  }, []);

  // Group items by display column
  const columnItems: TimeBlockTemplate[][] = Array.from({ length: 7 }, () => []);
  for (const item of items) {
    const col = DOW_TO_DISPLAY[item.day_of_week];
    if (col !== undefined) columnItems[col].push(item);
  }

  const isFormOpen = showAddForm !== null || editingItem !== null;

  return (
    <div className={styles.container}>
      {/* Day headers */}
      <div className={styles.headerRow}>
        <div className={styles.timeGutter} />
        {DAYS.map((day, i) => (
          <div key={i} className={styles.dayHeader}>
            <span>{day}</span>
            <button
              className={styles.addDayBtn}
              onClick={() => openAddForm(i)}
              title={`在${day}添加`}
            >
              <Plus size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className={styles.gridBody}>
        {/* Time gutter */}
        <div className={styles.timeGutter}>
          {HOURS.map((h) => (
            <div key={h} className={styles.hourLabel} style={{ height: hourHeight }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((_, dayIdx) => (
          <div key={dayIdx} className={styles.dayColumn} style={{ height: HOURS.length * hourHeight }}>
            {/* Hour grid lines */}
            {HOURS.map((h) => (
              <div key={h} className={styles.hourLine} style={{ top: (h - startHour) * hourHeight }} />
            ))}

            {/* Template blocks */}
            {columnItems[dayIdx].map((item) => {
              const top = timeToY(item.start_time, hourHeight, startHour);
              const height = blockHeight(item.start_time, item.end_time, hourHeight);
              const bg = BLOCK_COLORS[item.type] || BLOCK_COLORS.custom;
              const border = BLOCK_BORDERS[item.type] || BLOCK_BORDERS.custom;

              return (
                <div
                  key={item.id}
                  className={styles.block}
                  style={{ top, height, background: bg, borderLeft: `3px solid ${border}` }}
                >
                  <div className={styles.blockContent}>
                    <span className={styles.blockLabel}>{item.label}</span>
                    <span className={styles.blockTime}>{item.start_time}–{item.end_time}</span>
                  </div>
                  <div className={styles.blockActions}>
                    <button onClick={() => openEditForm(item)} title="编辑">
                      <Edit3 size={11} />
                    </button>
                    <button onClick={() => onDelete(item.id)} title="删除">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Inline form for add/edit */}
      {isFormOpen && (
        <div className={styles.formOverlay}>
          <div className={styles.form}>
            <div className={styles.formTitle}>
              {editingItem ? '编辑 Time Block' : `添加 Time Block — ${showAddForm ? DAYS[showAddForm.dayIdx] : ''}`}
            </div>
            <div className={styles.formFields}>
              <label>
                名称
                <input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：学习" />
              </label>
              <label>
                类型
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="study">学习</option>
                  <option value="rest">休息</option>
                  <option value="meal">用餐</option>
                  <option value="exercise">运动</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
              <div className={styles.timeRow}>
                <label>
                  开始
                  <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
                </label>
                <label>
                  结束
                  <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
                </label>
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={handleCancelForm}>取消</button>
              <button className={styles.confirmBtn} onClick={editingItem ? handleSubmitEdit : handleSubmitAdd}>
                {editingItem ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
