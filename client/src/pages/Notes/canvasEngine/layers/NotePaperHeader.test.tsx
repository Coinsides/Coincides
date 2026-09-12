import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotePaperHeader, type NotePaperHeaderProps } from './NotePaperHeader';

function props(overrides: Partial<NotePaperHeaderProps> = {}) {
  return { titleDraft: 'Existing note', descriptionDraft: '', contentReadOnly: false,
    onTitleDraftChange: vi.fn(), onDescriptionDraftChange: vi.fn(), onSaveTitle: vi.fn(),
    onSaveDescription: vi.fn(), onHeightChange: vi.fn(), ...overrides };
}

describe('paper note metadata', () => {
  it('commits title and description through their existing adapter callbacks on ordinary blur/Enter', async () => {
    const input = props();
    render(<NotePaperHeader {...input} />);
    const title = screen.getByRole('textbox', { name: 'Note title' });
    const description = screen.getByRole('textbox', { name: 'Note description' });
    fireEvent.change(title, { target: { value: 'Renamed note' } });
    expect(input.onTitleDraftChange).toHaveBeenCalledWith('Renamed note');
    title.focus(); fireEvent.keyDown(title, { key: 'Enter' });
    fireEvent.change(description, { target: { value: 'A description' } });
    fireEvent.blur(description);
    await act(async () => { await Promise.resolve(); });
    expect(input.onSaveTitle).toHaveBeenCalledOnce();
    expect(input.onDescriptionDraftChange).toHaveBeenCalledWith('A description');
    expect(input.onSaveDescription).toHaveBeenCalledOnce();
  });

  it('does not commit an IME confirmation and leaves readonly metadata without mutation callbacks', async () => {
    const input = props();
    const view = render(<NotePaperHeader {...input} />);
    const title = screen.getByRole('textbox', { name: 'Note title' });
    title.focus(); fireEvent.keyDown(title, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(title);
    expect(input.onSaveTitle).not.toHaveBeenCalled();
    view.rerender(<NotePaperHeader {...input} contentReadOnly />);
    fireEvent.blur(title);
    fireEvent.blur(screen.getByRole('textbox', { name: 'Note description' }));
    await act(async () => { await Promise.resolve(); });
    expect((title as HTMLTextAreaElement).readOnly).toBe(true);
    expect(input.onSaveTitle).not.toHaveBeenCalled();
    expect(input.onSaveDescription).not.toHaveBeenCalled();
  });

  it('caps browser-measured field heights and reports the bounded band', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900);
    const offset = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
    try {
      const input = props({ titleDraft: 'long '.repeat(80), descriptionDraft: 'details '.repeat(200) });
      render(<NotePaperHeader {...input} />);
      expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLElement).style.height).toBe('81.6px');
      expect((screen.getByRole('textbox', { name: 'Note description' }) as HTMLElement).style.height).toBe('39px');
      expect(input.onHeightChange).toHaveBeenCalledWith(240);
    } finally { scroll.mockRestore(); offset.mockRestore(); }
  });

  it('does not add a blank title line for Chromium fractional-line glyph overflow', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label') === 'Note title' ? 42 : 20;
    });
    try {
      render(<NotePaperHeader {...props()} />);
      expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLElement).style.height).toBe('40.8px');
      expect((screen.getByRole('textbox', { name: 'Note description' }) as HTMLElement).style.height).toBe('19.5px');
    } finally { scroll.mockRestore(); }
  });
});
