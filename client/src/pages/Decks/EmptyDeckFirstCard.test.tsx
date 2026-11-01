import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSection } from '@shared/types';
import CardModal from '@/components/CardModal/CardModal';
import { useCardStore } from '@/stores/cardStore';
import { useCourseStore } from '@/stores/courseStore';
import { useDeckStore } from '@/stores/deckStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import DeckDetail from './DeckDetail';

// Human path for an empty deck: the first section and the first card must be
// reachable from the UI, not only through the Agent's create_section tool.
const deck = { id: 'deck-1', name: 'Networks', course_id: 'course-1', description: null } as never;

function section(id: string, name: string, deckId = 'deck-1'): CardSection {
  return { id, deck_id: deckId, user_id: 'user-1', name, order_index: 0, created_at: '', updated_at: '' } as CardSection;
}

const createSection = vi.fn(async (deckId: string, name: string) => {
  const created = section(`section-${name}`, name, deckId);
  useSectionStore.setState((state) => ({ sections: [...state.sections, created] }));
  return created;
});
const createCard = vi.fn(async (data: Record<string, unknown>) => ({ id: 'card-1', ...data }));

beforeEach(() => {
  vi.clearAllMocks();
  useCardStore.setState({ cards: [], loading: false, fetchCards: vi.fn(async () => {}), createCard } as never);
  useDeckStore.setState({ decks: [deck], fetchDecks: vi.fn(async () => {}) } as never);
  useSectionStore.setState({ sections: [], fetchSections: vi.fn(async () => {}), createSection } as never);
  useCourseStore.setState({ courses: [] } as never);
  useTagStore.setState({ tags: [], tagGroups: [], fetchTagGroups: vi.fn(async () => {}) } as never);
  useReviewStore.setState({ dueCount: 0, fetchDueCount: vi.fn(async () => {}) } as never);
  useUIStore.setState({ modal: null });
});

function renderDeck() {
  return render(
    <MemoryRouter initialEntries={['/decks/deck-1']}>
      <Routes><Route path="/decks/:deckId" element={<DeckDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe('empty deck', () => {
  it('lets a person create the first section from the deck page', async () => {
    renderDeck();
    expect(screen.getByText('No cards in this deck')).toBeTruthy();
    const empty = screen.getByText('No cards in this deck').closest('div') as HTMLElement;
    fireEvent.click(within(empty).getByRole('button', { name: 'Add section' }));

    const input = await screen.findByPlaceholderText('Section name...');
    fireEvent.change(input, { target: { value: 'Ports' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createSection).toHaveBeenCalledWith('deck-1', 'Ports', 0));
    // The new, still empty section stays visible so a card can be added to it.
    expect(await screen.findByText('Ports')).toBeTruthy();
  });

  it('lets a person create a section and the first card from the card dialog', async () => {
    // Another deck's section in the shared store must not be offered here.
    useSectionStore.setState({ sections: [section('other', 'Other deck section', 'deck-2')] } as never);
    useUIStore.setState({ modal: { type: 'card-create', data: { deckId: 'deck-1' } } } as never);
    render(<CardModal />);

    const dialog = document.body;
    expect(within(dialog).queryByText('Other deck section')).toBeNull();
    const save = () => screen.getAllByRole('button').find((button) => button.getAttribute('type') === 'submit') as HTMLButtonElement;
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'What is a port?' } });
    expect(save().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('New section name'), { target: { value: 'Ports' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create section' }));
    await waitFor(() => expect(createSection).toHaveBeenCalledWith('deck-1', 'Ports', 0));
    await waitFor(() => expect(save().disabled).toBe(false));

    // Submit the form itself: template content fields have their own native
    // required checks, which this section-path test does not exercise.
    fireEvent.submit(save().form!);
    await waitFor(() => expect(createCard).toHaveBeenCalledWith(expect.objectContaining({
      deck_id: 'deck-1', section_id: 'section-Ports', title: 'What is a port?',
    })));
  });
});
