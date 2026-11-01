import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Proposal, ProposalType } from '@shared/types';
import { useAgentStore } from '@/stores/agentStore';
import { useCardStore } from '@/stores/cardStore';
import { useCourseStore } from '@/stores/courseStore';
import { useDeckStore } from '@/stores/deckStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useUIStore } from '@/stores/uiStore';
import CourseDetailPage from '@/pages/Courses/CourseDetail';
import DeckDetailPage from '@/pages/Decks/DeckDetail';
import AgentPanel from './AgentPanel';

// R2-07④: adopting a proposal in the Agent inbox must update the host page's
// list in place, through the shared stores the page already watches.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: { user: null }) => unknown) => select({ user: null }) }));

const COURSE = 'adopt-course';
const DECK = 'adopt-deck';
const course = { id: COURSE, user_id: 'adopt-user', name: 'Vectors', code: 'V1', color: '#6366f1', weight: 1,
  description: null, semester: null, created_at: '2026-10-01 08:00:00', updated_at: '2026-10-01 08:00:00' };
const existingNote = { id: 'adopt-note-old', title: 'Existing note', description: null, updated_at: '2026-10-01 08:00:00' };
const adoptedNote = { id: 'adopt-note-new', title: '整理向量笔记', description: null, updated_at: '2026-11-01 08:00:00' };
const adoptedCard = { id: 'adopt-card', deck_id: DECK, section_id: 'adopt-section', title: '向量定义',
  template_type: 'definition', importance: 0, fields: {}, tags: [], order_index: 0 };

function proposal(id: string, type: ProposalType, data: unknown): Proposal {
  return { id, user_id: 'adopt-user', conversation_id: 'adopt-chat', type, data, status: 'pending',
    created_at: '2026-11-01 08:00:00', resolved_at: null };
}

let pending: Proposal[];
let applied: Set<string>;

beforeEach(() => {
  vi.clearAllMocks();
  applied = new Set();
  useUIStore.setState({ agentPanelOpen: false, agentContextHint: null, ambientAgentContextHint: null,
    ambientAgentContextOwner: null, ambientAgentContextDismissed: false, toasts: [], modal: null });
  useAgentStore.setState({ activeConversationId: 'adopt-chat', conversations: [], messages: [],
    preferenceForms: [], streaming: false, streamingText: '', activeToolName: null, loading: false });
  useCourseStore.setState({ courses: [] });
  useDeckStore.setState({ decks: [] });
  useCardStore.setState({ cards: [] });
  useSectionStore.setState({ sections: [] });
  http.get.mockImplementation(async (url: string, config?: { params?: Record<string, string> }) => {
    const noteDone = applied.has('adopt-note-proposal');
    const cardDone = applied.has('adopt-card-proposal');
    if (url === '/proposals') return { data: [...pending] };
    if (url === `/courses/${COURSE}/summary`) return { data: { course, goals: [], decks: [], documents: [] } };
    if (url === `/notes?course_id=${COURSE}&status=active`) return { data: noteDone ? [adoptedNote, existingNote] : [existingNote] };
    if (url === '/courses') return { data: [{ ...course, recent_note: { ...(noteDone ? adoptedNote : existingNote), excerpt: null } }] };
    if (url === '/decks') return { data: [{ id: DECK, name: 'Vector cards', course_id: COURSE, description: null, card_count: cardDone ? 1 : 0 }] };
    if (url === '/sections' && config?.params?.deck_id === DECK) {
      return { data: [{ id: 'adopt-section', deck_id: DECK, user_id: 'adopt-user', name: 'Basics', order_index: 0 }] };
    }
    if (url === '/cards') return { data: cardDone ? [adoptedCard] : [] };
    if (url === '/review/due/count') return { data: { count: 0 } };
    return { data: [] };
  });
  http.post.mockImplementation(async (url: string) => {
    const match = /^\/proposals\/([^/]+)\/apply$/.exec(url);
    if (!match) throw new Error(`Unexpected test route: ${url}`);
    applied.add(match[1]);
    pending = pending.filter((item) => item.id !== match[1]);
    return { data: { success: true } };
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});

afterEach(() => { vi.restoreAllMocks(); });

function renderHost(path: string, route: string, page: JSX.Element) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path={route} element={<>{page}<AgentPanel /></>} />
  </Routes></MemoryRouter>);
  act(() => useUIStore.getState().setAgentPanelOpen(true));
}

async function adopt(title: string) {
  fireEvent.click(await screen.findByRole('button', { name: '提案，1 条待处理' }));
  const inbox = await screen.findByRole('region', { name: '提案收件箱' });
  const card = await within(inbox).findByRole('article', { name: title });
  fireEvent.click(within(card).getByRole('button', { name: '采纳' }));
}

describe('adopting an Agent proposal refreshes the host list in place', () => {
  it('shows an adopted note on the project page without a reload', async () => {
    pending = [proposal('adopt-note-proposal', 'organized_note', {
      title: '整理向量笔记', blocks: [{ title: '向量基础', plain_text: '方向与大小' }],
    })];
    renderHost(`/courses/${COURSE}`, '/courses/:courseId', <CourseDetailPage />);
    await screen.findByRole('button', { name: 'Open note Existing note' });
    expect(screen.queryByRole('button', { name: 'Open note 整理向量笔记' })).toBeNull();

    await adopt('整理向量笔记');
    expect(await screen.findByRole('button', { name: 'Open note 整理向量笔记' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open note Existing note' })).toBeTruthy();
  });

  it('shows adopted cards on the deck page without a reload', async () => {
    pending = [proposal('adopt-card-proposal', 'batch_cards', {
      title: '向量复习卡', items: [{ title: '向量定义', template_type: 'definition', deck_id: DECK, section_id: 'adopt-section' }],
    })];
    renderHost(`/decks/${DECK}`, '/decks/:deckId', <DeckDetailPage />);
    await screen.findByText('Basics');
    expect(screen.queryByText('向量定义')).toBeNull();

    await adopt('向量复习卡');
    await waitFor(() => expect(screen.getAllByText('向量定义').some((node) => !node.closest('[role="region"]'))).toBe(true));
  });
});
