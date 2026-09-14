import { useRef } from 'react';
import { X } from 'lucide-react';
import { describeProposal, proposalTime } from './proposalInboxModel';
import type { useProposalInbox } from './useProposalInbox';
import styles from './ProposalInbox.module.css';

type Props = ReturnType<typeof useProposalInbox> & { onClose: () => void };

export default function ProposalInbox({ proposals, loading, error, busy, refresh, resolve, onClose }: Props) {
  const region = useRef<HTMLElement>(null);
  return (
    <section id="agent-proposal-inbox" aria-label="提案收件箱" className={styles.inbox} ref={region}>
      <div className={styles.heading}>
        <h2>提案收件箱</h2>
        <button type="button" onClick={onClose} aria-label="关闭提案收件箱"><X size={16} /></button>
      </div>
      {error && <div role="alert" className={styles.status}>{error}<button type="button" onClick={() => void refresh()} disabled={loading}>重试</button></div>}
      {loading && <p role="status" className={styles.status}>正在刷新提案…</p>}
      {!loading && !error && proposals.length === 0 && <p role="status" className={styles.status}>暂无待处理提案</p>}
      <ul className={styles.list}>
        {proposals.map((proposal) => {
          const view = describeProposal(proposal);
          const time = proposalTime(proposal.created_at);
          const pendingAction = busy[proposal.id];
          return (
            <li key={proposal.id} className={styles.proposal}>
              <article aria-label={view.summary}>
                <div className={styles.meta}>
                  <span className={styles.badge}>{view.label}</span>
                  <span>来源：{proposal.conversation_id ? '聊天' : '材料'}</span>
                  <time dateTime={time.dateTime}>{time.label}</time>
                </div>
                <h3>{view.summary}</h3>
                {view.description && <p>{view.description}</p>}
                {view.detail && <p>{view.detail}</p>}
                {view.notice && <p className={styles.notice}>{view.notice}</p>}
                <div className={styles.actions}>
                  {view.canApply && <button type="button" className={styles.apply} disabled={!!pendingAction}
                    onClick={() => { region.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); void resolve(proposal, 'apply'); }}>
                    {pendingAction === 'apply' ? '处理中…' : view.applyLabel}
                  </button>}
                  <button type="button" disabled={!!pendingAction}
                    onClick={() => { region.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); void resolve(proposal, 'discard'); }}>
                    {pendingAction === 'discard' ? '丢弃中…' : '丢弃'}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
