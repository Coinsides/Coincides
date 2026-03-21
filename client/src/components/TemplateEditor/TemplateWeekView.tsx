import { useState, useCallback } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import type { TimeBlockTemplate } from '@shared/types';
import styles from './TemplateWeekView.module.css';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0];
const DOW_TO_DISPLAY: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

// Full 24 hours
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TB_TYPE_OPTIONS = [
  { value: 'study', label: 'Study', color: '#6366f1' },
  { value: 'rest', label: 'Rest', color: '#f59e0b' },
  { value: 'meal', label: 'Meal', color: '#22c55e' },
  { value: 'exercise', label: 'Exercise', color: '#ec4899' },
];

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

interface TemplateWeekViewProps {
  items: TimeBlockTemplate[];
  onAdd: (item: { label: string; type: string; day_of_week: number; start_time: string; end_time: string; color?: string }) => void;
  onEdit: (id: string, item: { label: string; type: string; start_time: string; end_time: string; color?: string }) => void;
  onDelete: (id: string) => void;
}

// Total height = 24 hours. We use a fixed pixel-per-hour to fill the container.
const HOUR_HEIGHT = 24; // px per hour — 24 * 24 = 576px total grid height

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h * 60 + m) * (HOUR_HEIGHT / 60);
}

function blockHeight(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(((eh * 60 + em) - (sh * 60 + sm)) * (HOUR_HEIGHT / 60), 16);
}

export default function TemplateWeekView({ items, onAdd, onEdit, onDelete }: TemplateWeekViewProps) {
  const [editingItem, setEditingItem] = useState<TimeBlockTemplate | null>(null);
  const [addingDayIdx, setAddingDayIdx] = useState<number | null>(null);

  // Form state — mirrors Calendar's TB create modal
  const [formType, setFormType] = useState('study');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formColor, setFormColor] = useState('');
  const [customTypeInput, setCustomTypeInput] = useState('');

  const openAddForm = useCallback((dayIdx: number) => {
    setEditingItem(null);
    setFormType('study');
    setFormStart('09:00');
    setFormEnd('18:00');
    setFormColor('');
    setCustomTypeInput('');
    setAddingDayIdx(dayIdx);
  }, []);

  const openEditForm = useCallback((item: TimeBlockTemplate) => {
    setAddingDayIdx(null);
    setFormType(item.type);
    setFormStart(item.start_time);
    setFormEnd(item.end_time);
    setFormColor(item.color || '');
    setCustomTypeInput('');
    setEditingItem(item);
  }, []);

  const handleSubmitAdd = useCallback(() => {
    if (addingDayIdx === null || !formType.trim()) return;
    onAdd({
      label: formType.trim(),
      type: formType.trim(),
      day_of_week: DISPLAY_TO_DOW[addingDayIdx],
      start_time: formStart,
      end_time: formEnd,
      color: formColor || undefined,
    });
    setAddingDayIdx(null);
  }, [addingDayIdx, formType, formStart, formEnd, formColor, onAdd]);

  const handleSubmitEdit = useCallback(() => {
    if (!editingItem || !formType.trim()) return;
    onEdit(editingItem.id, {
      label: formType.trim(),
      type: formType.trim(),
      start_time: formStart,
      end_time: formEnd,
      color: formColor || undefined,
    });
    setEditingItem(null);
  }, [editingItem, formType, formStart, formEnd, formColor, onEdit]);

  const handleCancelForm = useCallback(() => {
    setAddingDayIdx(null);
    setEditingItem(null);
  }, []);

  // Group items by display column
  const columnItems: TimeBlockTemplate[][] = Array.from({ length: 7 }, () => []);
  for (const item of items) {
    const col = DOW_TO_DISPLAY[item.day_of_week];
    if (col !== undefined) columnItems[col].push(item);
  }

  const isFormOpen = addingDayIdx !== null || editingItem !== null;
  const totalGridHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className={styles.container}>
      {/* Day headers */}
      <div className={styles.headerRow}>
        <div className={styles.timeGutter} />
        {DAYS.map((day, i) => (
          <div key={i} className={styles.dayHeader}>
            <span>{day}</span>
            <button className={styles.addDayBtn} onClick={() => openAddForm(i)} title={`在${day}添加`}>
              <Plus size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Grid body — fixed height, no scroll */}
      <div className={styles.gridBody} style={{ height: totalGridHeight }}>
        {/* Time gutter */}
        <div className={styles.timeGutter}>
          {HOURS.map((h) => (
            <div key={h} className={styles.hourLabel} style={{ height: HOUR_HEIGHT }}>
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((_, dayIdx) => (
          <div key={dayIdx} className={styles.dayColumn} style={{ height: totalGridHeight }}>
            {HOURS.map((h) => (
              <div key={h} className={styles.hourLine} style={{ top: h * HOUR_HEIGHT }} />
            ))}
            {columnItems[dayIdx].map((item) => {
              const top = timeToY(item.start_time);
              const height = blockHeight(item.start_time, item.end_time);
              const bg = item.color ? `${item.color}40` : (BLOCK_COLORS[item.type] || BLOCK_COLORS.custom);
              const border = item.color || BLOCK_BORDERS[item.type] || BLOCK_BORDERS.custom;
              return (
                <div key={item.id} className={styles.block} style={{ top, height, background: bg, borderLeft: `3px solid ${border}` }}>
                  <div className={styles.blockContent}>
                    <span className={styles.blockLabel}>{item.label}</span>
                    <span className={styles.blockTime}>{item.start_time}–{item.end_time}</span>
                  </div>
                  <div className={styles.blockActions}>
                    <button onClick={() => openEditForm(item)} title="编辑"><Edit3 size={10} /></button>
                    <button onClick={() => onDelete(item.id)} title="删除"><Trash2 size={10} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Form modal — same style as Calendar's TB create/edit */}
      {isFormOpen && (
        <div className={styles.formOverlay} onClick={(e) => { if (e.target === e.currentTarget) handleCancelForm(); }}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formTitle}>
              {editingItem ? 'Edit Time Block' : `New Time Block — ${addingDayIdx !== null ? DAYS[addingDayIdx] : ''}`}
            </div>

            {/* Type grid — matches Calendar */}
            <div className={styles.formField}>
              <label>Type</label>
              <div className={styles.typeGrid}>
                {TB_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.typeOption} ${formType === opt.value ? styles.typeSelected : ''}`}
                    onClick={() => setFormType(opt.value)}
                  >
                    <span className={styles.typeDot} style={{ backgroundColor: opt.color }} />
                    {opt.label}
                  </button>
                ))}
                {formType && !TB_TYPE_OPTIONS.some((o) => o.value === formType) && (
                  <button type="button" className={`${styles.typeOption} ${styles.typeSelected}`}>
                    <span className={styles.typeDot} style={{ backgroundColor: '#8b5cf6' }} />
                    {formType.charAt(0).toUpperCase() + formType.slice(1)}
                  </button>
                )}
                <div className={styles.customTypeRow}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Custom type..."
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTypeInput.trim()) {
                        setFormType(customTypeInput.trim().toLowerCase());
                        setCustomTypeInput('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.customTypeAdd}
                    disabled={!customTypeInput.trim()}
                    onClick={() => { setFormType(customTypeInput.trim().toLowerCase()); setCustomTypeInput(''); }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Time pickers */}
            <div className={styles.timeRow}>
              <div className={styles.formField}>
                <label>Start</label>
                <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className={styles.formInput} />
              </div>
              <div className={styles.formField}>
                <label>End</label>
                <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className={styles.formInput} />
              </div>
            </div>

            {/* Color */}
            <div className={styles.formField}>
              <label>Color (optional)</label>
              <input type="color" value={formColor || '#8b5cf6'} onChange={(e) => setFormColor(e.target.value)} className={styles.colorInput} />
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={handleCancelForm}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={editingItem ? handleSubmitEdit : handleSubmitAdd}
                disabled={!formType.trim()}
              >
                {editingItem ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
