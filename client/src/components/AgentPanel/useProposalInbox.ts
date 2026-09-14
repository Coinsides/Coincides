import { useCallback, useEffect, useRef, useState } from 'react';
import type { Proposal } from '@shared/types';
import api from '@/services/api';
import { useUIStore } from '@/stores/uiStore';
import { describeProposal } from './proposalInboxModel';

export function useProposalInbox(enabled: boolean, streaming: boolean) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<Record<string, 'apply' | 'discard'>>({});
  const inFlight = useRef(new Set<string>());
  const request = useRef(0);
  const active = useRef(false);
  const addToast = useUIStore((s) => s.addToast);

  const refresh = useCallback(async () => {
    if (!active.current) return;
    const version = ++request.current;
    setLoading(true);
    try {
      const { data } = await api.get<Proposal[]>('/proposals', { params: { status: 'pending' } });
      if (active.current && version === request.current) {
        setProposals(data.filter((proposal) => proposal.status === 'pending'));
        setError('');
      }
    } catch {
      if (active.current && version === request.current) setError('提案加载失败，请重试');
    } finally {
      if (active.current && version === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    active.current = enabled;
    if (!enabled) {
      setProposals([]);
      setError('');
      setLoading(false);
      return;
    }
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active.current = false;
      request.current += 1;
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, streaming, refresh]);

  const resolve = useCallback(async (proposal: Proposal, action: 'apply' | 'discard') => {
    if (inFlight.current.has(proposal.id) || (action === 'apply' && !describeProposal(proposal).canApply)) return;
    inFlight.current.add(proposal.id);
    setBusy((current) => ({ ...current, [proposal.id]: action }));
    try {
      await api.post(`/proposals/${proposal.id}/${action}`, {});
      // Invalidate older reads before they can bring a resolved card back.
      request.current += 1;
      setProposals((current) => current.filter((item) => item.id !== proposal.id));
      addToast('success', action === 'discard' ? '提案已丢弃' : describeProposal(proposal).applyMessage);
    } catch {
      addToast('error', action === 'discard' ? '丢弃失败，请重试' : '处理失败，请重试');
    } finally {
      await refresh();
      inFlight.current.delete(proposal.id);
      setBusy((current) => {
        const next = { ...current };
        delete next[proposal.id];
        return next;
      });
    }
  }, [addToast, refresh]);

  return { proposals, loading, error, busy, refresh, resolve };
}
