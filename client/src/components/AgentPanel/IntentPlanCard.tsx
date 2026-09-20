import { useState } from 'react';
import type { AgentMessage } from '@shared/types';
import api from '@/services/api';
import { useAgentStore } from '@/stores/agentStore';
import { notifyBoardChanged } from '@/pages/Boards/boardEvents';
import styles from './IntentPlanCard.module.css';

export default function IntentPlanCard({ message }: { message: AgentMessage }) {
  const plan = message.meta?.intent_plan;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!plan) return null;
  const decide = async (decision: 'release' | 'discard') => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/agent/conversations/${message.conversation_id}/messages/${message.id}/plan`, { decision });
      useAgentStore.setState(state => ({ messages: state.messages.map(row => row.id === message.id ? { ...row, meta: data.meta, turn_receipt: data.turn_receipt } : row) }));
      if (decision === 'release') {
        for (const step of plan.steps) if ('board_id' in step.anchor) notifyBoardChanged(step.anchor.board_id);
        if (plan.kind === 'note_patch') window.dispatchEvent(new Event('coincides:proposals-changed'));
      }
    } catch (err) { setError(err instanceof Error ? err.message : '计划未能处理，请重试'); }
    finally { setBusy(false); }
  };
  return <section className={styles.plan} aria-label="意图计划">
    <strong>计划</strong>
    <ol>{plan.steps.map((step, index) => <li key={index}><span>{step.verb}</span> · {step.target_name}</li>)}</ol>
    {plan.kind === 'note_patch' && <p>放行后进入提案收件箱，逐块查看差异并采纳。</p>}
    {plan.status === 'pending' ? <div className={styles.actions}>
      <button disabled={busy} onClick={() => void decide('release')}>放行</button>
      <button disabled={busy} onClick={() => void decide('discard')}>再想想</button>
    </div> : <p role="status">{plan.status === 'released' ? '已放行' : '已丢弃，未执行'}
      {plan.receipt_ids?.length ? ` · ${plan.receipt_ids.length} 条可撤收据` : ''}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
