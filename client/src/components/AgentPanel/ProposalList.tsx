import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useProposalStore, type ProposalItem, type ProposalData } from '@/stores/proposalStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './ProposalList.module.css';

const typeBadgeColors: Record<string, { bg: string; text: string }> = {
  batch_cards: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1' },
  study_plan: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
  goal_breakdown: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' },
  schedule_adjustment: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
};

const typeLabels: Record<string, string> = {
  batch_cards: 'Cards',
  study_plan: 'Study Plan',
  goal_breakdown: 'Goals',
  schedule_adjustment: 'Schedule',
};

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
    } catch (err) {
      console.error('Failed to apply proposal:', err);
      addToast('error', 'Failed to apply proposal');
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
    const newItems = [...proposal.data.items];
    newItems.splice(itemIndex, 1);
    const newData: ProposalData = { ...proposal.data, items: newItems };
    useProposalStore.getState().updateProposal(proposal.id, newData);
  };

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
              <span className={styles.proposalTitle}>{proposal.data.title}</span>
              <span className={styles.itemCount}>{proposal.data.items.length} items</span>
            </button>

            {expanded && (
              <div className={styles.proposalBody}>
                <p className={styles.description}>{proposal.data.description}</p>
                <div className={styles.items}>
                  {proposal.data.items.map((item, i) => (
                    <div key={i} className={styles.item}>
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>
                          {(item.title as string) || `Item ${i + 1}`}
                        </span>
                        {item.template_type ? (
                          <span className={styles.itemMeta}>{String(item.template_type)}</span>
                        ) : null}
                        {(item.scheduled_date || item.date) ? (
                          <span className={styles.itemDate}>
                            {String(item.scheduled_date || item.date)}
                          </span>
                        ) : null}
                        {item.priority ? (
                          <span className={styles.itemMeta}>{String(item.priority)}</span>
                        ) : null}
                        {item.serves_must ? (
                          <span className={styles.itemServes}>→ {String(item.serves_must)}</span>
                        ) : null}
                      </div>
                      <button
                        className={styles.removeItem}
                        onClick={() => handleRemoveItem(proposal, i)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
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
