import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SourcePageRegister } from '@/pages/Sources/sourceApi';

const api = vi.hoisted(() => ({ getSourcePagesByProjectionNote: vi.fn(), generateSourcePages: vi.fn() }));
vi.mock('@/pages/Sources/sourceApi', () => api);

import { documentKey, useDocumentTabsStore } from '@/stores/documentTabsStore';
import { useSourcePageViewController } from './useSourcePageViewController';

const register = (input: Partial<SourcePageRegister>): SourcePageRegister => ({
  source_id: 'source', supported: true, status: 'complete', expected: 1, completed: 1, failed_pages: [],
  pages: [{ page_number: 1, asset_id: 'asset', image_width: 640, image_height: 360, pdf_width: 640, pdf_height: 360 }], ...input,
});
const open = (noteId: string) => renderHook(() => useSourcePageViewController({ noteId, enabled: true }));

describe('a Source that is only its pages', () => {
  beforeEach(() => {
    api.getSourcePagesByProjectionNote.mockReset();
    useDocumentTabsStore.setState({ tabs: [] });
  });

  it('stays on the page with no text to switch to, even when asked for the text', async () => {
    api.getSourcePagesByProjectionNote.mockResolvedValue(register({ text_view: false }));
    const view = open('image-note');
    await waitFor(() => expect(view.result.current.register).not.toBeNull());
    expect([view.result.current.active, view.result.current.textAvailable]).toEqual([true, false]);
    act(() => view.result.current.setMode('text'));
    expect(view.result.current.active).toBe(true);
  });

  it('is on the page even when its tab remembered the text view', async () => {
    useDocumentTabsStore.setState({ tabs: [{ key: documentKey('note', 'image-note'), sourceView: { mode: 'text', page: 1 } }] as never });
    api.getSourcePagesByProjectionNote.mockResolvedValue(register({ text_view: false }));
    const view = open('image-note');
    await waitFor(() => expect(view.result.current.register).not.toBeNull());
    expect(view.result.current.active).toBe(true);
  });

  it('is on the page while it has no page image yet, so the generate entry is reachable', async () => {
    api.getSourcePagesByProjectionNote.mockResolvedValue(register({ text_view: false, status: 'none', expected: 0, completed: 0, pages: [] }));
    const view = open('old-image-note');
    await waitFor(() => expect(view.result.current.register).not.toBeNull());
    expect([view.result.current.active, view.result.current.available]).toEqual([true, true]);
  });

  it('a Source with text keeps its switch, and an older server without the field counts as having text', async () => {
    api.getSourcePagesByProjectionNote.mockResolvedValue(register({}));
    const view = open('pdf-note');
    await waitFor(() => expect(view.result.current.register).not.toBeNull());
    expect(view.result.current.textAvailable).toBe(true);
    act(() => view.result.current.setMode('text'));
    expect(view.result.current.active).toBe(false);
    act(() => view.result.current.setMode('pages'));
    expect(view.result.current.active).toBe(true);
  });
});
