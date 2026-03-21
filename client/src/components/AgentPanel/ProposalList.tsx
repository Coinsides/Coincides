import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useProposalStore, type ProposalItem, type ProposalData } from '@/stores/proposalStore';
import { useUIStore } from '@/stores/uiStore';
import TimePickerInline from './TimePickerInline';
import styles from './ProposalList.module.css';

const typeBadgeColors: Record<string, { bg: string; text: string }> = {
  batch_cards: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1' },
  study_plan: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
  goal_breakdown: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' },
  schedule_adjustment: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
  time_block_setup: { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' },
};

const typeLabels: Record<string, string> = {
  batch_cards: 'Cards',
  study_plan: 'Study Plan',
  goal_breakdown: 'Goals',
  schedule_adjustment: 'Schedule',
  time_block_setup: 'Time Block',
};

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * Safely extract items array from proposal data.
 * Agent may produce malformed data — guard against all shapes.
 */
function safeItems(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.items)) return d.items;
  return [];
}

function safeString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (val != null) return String(val);
  return fallback;
}

/**
 * Detect if a proposal uses Calendar Event scheduling mode.
 * Check proposal-level scheduling_mode or per-item start_time/end_time.
 */
function isCalendarEventMode(proposal: ProposalItem): boolean {
  const data = proposal.data as unknown as Record<string, unknown>;
  if (data?.scheduling_mode === 'calendar_event') return true;
  // Also detect if any item already has start_time/end_time set
  const items = safeItems(data);
  return items.some((item) => item.start_time || item.end_time);
}

export default function ProposalList() {
  const { proposals, loading, fetchProposals, applyProposal, discardProposal } = useProposalStore();
  const addToast = useUIStore((s) => s.addToast);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleApply = async (id: string) => {
    try {
      await applyProposal(id);
      addToast('success', 'Proposal applied successfully');
    } catch (err: any) {
      console.error('Failed to apply proposal:', err);
      const msg = err?.response?.data?.error || 'Failed to apply proposal';
      addToast('error', msg);
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      await discardProposal(id);
      addToast('info', 'Proposal discarded');
    } catch (err) {
      console.error('Failed to discard proposal:', err);
      addToast('error', 'Failed to discard proposal');
    }
  };

  const handleRemoveItem = (proposal: ProposalItem, itemIndex: number) => {
    const items = safeItems(proposal.data);
    const newItems = [...items];
    newItems.splice(itemIndex, 1);
    const newData: ProposalData = { ...proposal.data, items: newItems };
    useProposalStore.getState().updateProposal(proposal.id, newData);
  };

  /** Update a single item's time field and persist via updateProposal */
  const handleTimeChange = useCallback(
    (proposal: ProposalItem, itemIndex: number, field: 'start_time' | 'end_time', time: string) => {
      const items = safeItems(proposal.data);
      const newItems = items.map((item, i) =>
        i === itemIndex ? { ...item, [field]: time } : item,
      );
      const newData: ProposalData = { ...proposal.data, items: newItems };
      useProposalStore.getState().updateProposal(proposal.id, newData);
    },
    [],
  );

  if (loading && proposals.length === 0) {
    return <div className={styles.empty}>Loading proposals...</div>;
  }

  if (proposals.length === 0) {
    return <div className={styles.empty}>No pending proposals</div>;
  }

  return (
    <div className={styles.list}>
      {proposals.map((proposal) => {
        const expanded = expandedId === proposal.id;
        const badgeColor = typeBadgeColors[proposal.type] || typeBadgeColors.batch_cards;
        const items = safeItems(proposal.data);
        const title = safeString(proposal.data?.title, 'Untitled proposal');
        const description = safeString(proposal.data?.description);

        return (
          <div key={proposal.id} className={styles.proposal}>
            <button
              className={styles.proposalHeader}
              onClick={() => setExpandedId(expanded ? null : proposal.id)}
            >
              <span className={styles.expandIcon}>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span
                className={styles.typeBadge}
                style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
              >
                {typeLabels[proposal.type] || proposal.type}
              </span>
              <span className={styles.proposalTitle}>{title}</span>
              <span className={styles.itemCount}>{items.length} items</span>
            </button>

            {expanded && (
              <div className={styles.proposalBody}>
                {description && <p className={styles.description}>{description}</p>}
                <div className={styles.items}>
                  {items.map((item, i) => {
                    const calendarMode = proposal.type === 'study_plan' && isCalendarEventMode(proposal);
                    const tbLabel = safeString(item.time_block_label);
                    const isTimeBlockSetup = proposal.type === 'time_block_setup';

                    // For time_block_setup items, build a descriptive title from label + day_of_week + times
                    const itemTitle = isTimeBlockSetup
                      ? safeString(item.label, `Time Block ${i + 1}`)
                      : safeString(item.title, `Item ${i + 1}`);

                    return (
                      <div key={i} className={styles.item}>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {itemTitle}
                          </span>
                          {isTimeBlockSetup && item.day_of_week != null && (
                            <span className={styles.itemMeta}>
                              {DAY_NAMES[Number(item.day_of_week)] || `Day ${String(item.day_of_week)}`}
                            </span>
                          )}
                          {isTimeBlockSetup && !!(item.start_time || item.end_time) && (
                            <span className={styles.itemDate}>
                              {safeString(item.start_time)} – {safeString(item.end_time)}
                            </span>
                          )}
                          {item.template_type ? (
                            <span className={styles.itemMeta}>{safeString(item.template_type)}</span>
                          ) : null}
                          {(item.scheduled_date || item.date) ? (
                            <span className={styles.itemDate}>
                              {safeString(item.scheduled_date || item.date)}
                            </span>
                          ) : null}
                          {item.priority ? (
                            <span className={styles.itemMeta}>{safeString(item.priority)}</span>
                          ) : null}
                          {item.serves_must ? (
                            <span className={styles.itemServes}>→ {safeString(item.serves_must)}</span>
                          ) : null}
                        </div>

                        {/* Calendar Event mode: editable start/end time */}
                        {calendarMode && (
                          <div className={styles.timeEditors}>
                            <TimePickerInline
                              label="Start"
                              value={safeString(item.start_time)}
                              onChange={(t) => handleTimeChange(proposal, i, 'start_time', t)}
                            />
                            <span className={styles.timeSeparator}>–</span>
                            <TimePickerInline
                              label="End"
                              value={safeString(item.end_time)}
                              onChange={(t) => handleTimeChange(proposal, i, 'end_time', t)}
                            />
                          </div>
                        )}

                        {/* Time Block mode: read-only TB label */}
                        {!calendarMode && tbLabel && (
                          <span className={styles.tbBadge}>{tbLabel}</span>
                        )}

                        <button
                          className={styles.removeItem}
                          onClick={() => handleRemoveItem(proposal, i)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.actions}>
                  <button className={styles.applyBtn} onClick={() => handleApply(proposal.id)}>
                    Apply
                  </button>
                  <button className={styles.discardBtn} onClick={() => handleDiscard(proposal.id)}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
