import { useRef, useState } from 'react';
import api from '@/services/api';
import { notePatchReviewData, useNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import type { Proposal } from '@shared/types';
import styles from './ProposalInbox.module.css';

export function NotePatchReview({ proposal, onRefresh }: { proposal: Proposal; onRefresh: () => Promise<void> }) {
  const data = notePatchReviewData(proposal.data);
  const editor = useNoteAgentHumanEditor(data?.note_id ?? '');
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);
  if (!data) return <p role="alert">修订载荷无法读取，请刷新提案。</p>;
  const resolve = async (index: number, action: 'apply' | 'discard') => {
    if (pending.current) return;
    pending.current = true; setBusy(index); setError('');
    try {
      if (action === 'apply') {
        if (!editor || !await editor.applyPatch(proposal.id, index, data.patches[index])) {
          throw new Error('修订未采纳。靶块可能已经变化，请查看刷新后的状态。');
        }
      } else await api.post(`/proposals/${proposal.id}/patches/${index}/discard`, {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '处理失败，请重试。');
    } finally {
      await onRefresh(); pending.current = false; setBusy(null);
    }
  };
  return <div className={styles.patchReview}>
    {!editor && <p>请先<a href={`/#/notes/${encodeURIComponent(data.note_id)}`}>打开 {data.note_title || '笔记'}</a>，再逐块采纳。采纳后可在笔记中撤销。</p>}
    {error && <p role="alert">{error}</p>}
    {data.patches.map((patch, index) => <section key={`${patch.block_id}-${patch.unit_id}`} aria-label={`修订 ${index + 1}`}>
      <h4>块 {patch.block_id}</h4>
      <div className={styles.patchDiff}><div><strong>旧文</strong><pre>{patch.old_text}</pre></div><div><strong>新文</strong><pre>{patch.new_text}</pre></div></div>
      {patch.status === 'stale' && <p role="status">失效：靶块已变化，无法采纳。</p>}
      {patch.status === 'applied' && <p role="status">已采纳，可在笔记中撤销。</p>}
      {patch.status === 'discarded' && <p role="status">已弃。</p>}
      <div className={styles.actions}>
        <button type="button" disabled={!editor || busy !== null || patch.status !== 'pending'} onClick={() => void resolve(index, 'apply')}>勾 · 采纳</button>
        <button type="button" disabled={busy !== null || !['pending', 'stale'].includes(patch.status)} onClick={() => void resolve(index, 'discard')}>叉 · 弃</button>
      </div>
    </section>)}
  </div>;
}
