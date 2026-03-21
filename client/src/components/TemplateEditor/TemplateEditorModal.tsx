import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Edit3, Trash2, Calendar } from 'lucide-react';
import { useTimeBlockStore } from '@/stores/timeBlockStore';
import { useUIStore } from '@/stores/uiStore';
import MonthCalendar from '@/components/MonthCalendar';
import TemplateWeekView from './TemplateWeekView';
import type { TimeBlockTemplateSet, TimeBlockTemplate } from '@shared/types';
import styles from './TemplateEditorModal.module.css';

interface TemplateEditorModalProps {
  onClose: () => void;
  onApplied?: () => void;  // Callback after successfully applying template
}

export default function TemplateEditorModal({ onClose, onApplied }: TemplateEditorModalProps) {
  const addToast = useUIStore((s) => s.addToast);
  const {
    templateSets, templateItems, templatesLoading,
    fetchTemplateSets, createTemplateSet, renameTemplateSet, deleteTemplateSet,
    fetchTemplateItems, saveTemplateItems, applyTemplate,
  } = useTimeBlockStore();

  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<TimeBlockTemplate[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Load template sets on mount
  useEffect(() => {
    fetchTemplateSets();
  }, []);

  // Select first set when loaded
  useEffect(() => {
    if (templateSets.length > 0 && !activeSetId) {
      setActiveSetId(templateSets[0].id);
    }
  }, [templateSets, activeSetId]);

  // Load items when set changes
  useEffect(() => {
    if (activeSetId) {
      fetchTemplateItems(activeSetId);
    }
  }, [activeSetId]);

  // Sync loaded items to local state
  useEffect(() => {
    setLocalItems(templateItems);
    setDirty(false);
  }, [templateItems]);

  const activeSet = templateSets.find((s) => s.id === activeSetId) || null;

  // ── Template Set CRUD ──────────────────────────────────────

  const handleCreateSet = async () => {
    try {
      const newSet = await createTemplateSet('新模板');
      setActiveSetId(newSet.id);
    } catch {
      addToast('error', '创建模板失败');
    }
  };

  const handleRenameStart = () => {
    if (!activeSet) return;
    setRenameValue(activeSet.name);
    setRenameMode(true);
  };

  const handleRenameSubmit = async () => {
    if (!activeSetId || !renameValue.trim()) return;
    try {
      await renameTemplateSet(activeSetId, renameValue.trim());
      setRenameMode(false);
    } catch {
      addToast('error', '重命名失败');
    }
  };

  const handleDeleteSet = async () => {
    if (!activeSetId) return;
    if (!confirm('确定要删除这个模板集吗？')) return;
    try {
      await deleteTemplateSet(activeSetId);
      setActiveSetId(templateSets.find((s) => s.id !== activeSetId)?.id || null);
    } catch {
      addToast('error', '删除模板失败');
    }
  };

  // ── Template Items (local editing + save) ──────────────────

  const handleAddItem = useCallback((item: { label: string; type: string; day_of_week: number; start_time: string; end_time: string; color?: string }) => {
    const tempItem: TimeBlockTemplate = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      template_set_id: activeSetId || '',
      user_id: '',
      label: item.label,
      type: item.type,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      color: item.color || null,
      created_at: '',
      updated_at: '',
    };
    setLocalItems((prev) => [...prev, tempItem]);
    setDirty(true);
  }, [activeSetId]);

  const handleEditItem = useCallback((id: string, updates: { label: string; type: string; start_time: string; end_time: string; color?: string }) => {
    setLocalItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
    setDirty(true);
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!activeSetId) return;
    try {
      await saveTemplateItems(activeSetId, localItems.map((item) => ({
        label: item.label,
        type: item.type,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        color: item.color || undefined,
      })));
      setDirty(false);
      addToast('success', '模板已保存');
    } catch {
      addToast('error', '保存失败');
    }
  };

  // ── Apply Dialog ───────────────────────────────────────────

  const handleOpenApply = async () => {
    if (dirty) {
      await handleSave();
    }
    setShowApplyDialog(true);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Time Block 模板</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Template set tabs */}
        <div className={styles.setTabs}>
          <div className={styles.tabList}>
            {templateSets.map((set) => (
              <button
                key={set.id}
                className={`${styles.tab} ${set.id === activeSetId ? styles.activeTab : ''}`}
                onClick={() => setActiveSetId(set.id)}
              >
                {set.name}
              </button>
            ))}
          </div>
          <div className={styles.setActions}>
            <button className={styles.iconBtn} onClick={handleCreateSet} title="新建模板集">
              <Plus size={14} />
            </button>
            {activeSet && (
              <>
                <button className={styles.iconBtn} onClick={handleRenameStart} title="重命名">
                  <Edit3 size={14} />
                </button>
                <button className={styles.iconBtn} onClick={handleDeleteSet} title="删除模板集">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rename inline form */}
        {renameMode && (
          <div className={styles.renameRow}>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
              className={styles.renameInput}
            />
            <button className={styles.renameSave} onClick={handleRenameSubmit}>确认</button>
            <button className={styles.renameCancel} onClick={() => setRenameMode(false)}>取消</button>
          </div>
        )}

        {/* Week view */}
        {activeSetId ? (
          <div className={styles.weekViewContainer}>
            <TemplateWeekView
              items={localItems}
              onAdd={handleAddItem}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>还没有模板集。点击上方 + 号创建一个。</p>
          </div>
        )}

        {/* Footer actions */}
        <div className={styles.footer}>
          {dirty && (
            <button className={styles.saveBtn} onClick={handleSave}>
              保存模板
            </button>
          )}
          <button
            className={styles.applyBtn}
            onClick={handleOpenApply}
            disabled={!activeSetId || localItems.length === 0}
          >
            <Calendar size={14} />
            应用到日期范围
          </button>
        </div>

        {/* Apply dialog */}
        {showApplyDialog && activeSetId && (
          <ApplyTemplateDialog
            setId={activeSetId}
            onClose={() => setShowApplyDialog(false)}
            onApplied={() => {
              setShowApplyDialog(false);
              onApplied?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── ApplyTemplateDialog ──────────────────────────────────────

interface ApplyDialogProps {
  setId: string;
  onClose: () => void;
  onApplied: () => void;
}

function ApplyTemplateDialog({ setId, onClose, onApplied }: ApplyDialogProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { applyTemplate, fetchWeek } = useTimeBlockStore();

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(true);
  const [applying, setApplying] = useState(false);

  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  })();

  const handleApply = async () => {
    if (selectedDates.length === 0) return;
    setApplying(true);
    try {
      const result = await applyTemplate(setId, { dates: selectedDates, overwrite });
      const msg = `已创建 ${result.created_count} 个 Time Block` +
        (result.skipped_dates.length > 0 ? `，跳过 ${result.skipped_dates.length} 天（已有数据）` : '');
      addToast('success', msg);
      // Refresh calendar week data
      fetchWeek(selectedDates[0]);
      onApplied();
    } catch {
      addToast('error', '应用模板失败');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogTitle}>选择应用日期</div>
        <div className={styles.calendarWrap}>
          <MonthCalendar
            selectedDates={selectedDates}
            onDatesChange={setSelectedDates}
            minDate={tomorrow}
            maxDate={maxDate}
          />
        </div>
        <label className={styles.overwriteLabel}>
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          <span>覆盖已有 Time Block</span>
        </label>
        <div className={styles.dialogActions}>
          <button className={styles.cancelBtn} onClick={onClose}>取消</button>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={selectedDates.length === 0 || applying}
          >
            {applying ? '应用中...' : `确认应用（${selectedDates.length} 天）`}
          </button>
        </div>
      </div>
    </div>
  );
}
