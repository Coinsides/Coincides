import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './Settings';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
  updateSettings: vi.fn(), addToast: vi.fn(), logout: vi.fn(),
  userSettings: {} as Record<string, unknown>,
  defaultChatProvider: null as string | null,
  embeddingProviderName: null as string | null,
}));
const savedSettings = {
  active_provider: 'anthropic',
  ai_providers: {
    anthropic: { default_model: 'synthetic-anthropic-model' },
    generic: { default_model: 'synthetic-generic-model', base_url: 'https://synthetic-generic.invalid' },
  },
};
vi.mock('@/services/api', () => ({ default: mocks }));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (select = (state: unknown) => state) => select({
    user: {
      name: 'Synthetic user', email: 'synthetic-user@example.invalid',
      settings: mocks.userSettings,
    },
    updateSettings: mocks.updateSettings, logout: mocks.logout,
  }),
}));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (select: (state: { addToast: typeof mocks.addToast }) => unknown) => select({ addToast: mocks.addToast }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.userSettings = savedSettings;
  mocks.defaultChatProvider = null;
  mocks.embeddingProviderName = null;
  mocks.get.mockImplementation(async (url: string) => {
    if (url === '/palette-colors' || url === '/skin-suites') return { data: [] };
    if (url === '/settings/providers') {
      return { data: { providers: ['anthropic', 'openai', 'generic', 'deepseek', 'dashscope', 'voyage'].map((provider) => ({
        provider, has_key: true, has_local_key: true, masked_key: '****1111', source: 'local',
      })), default_chat_provider: mocks.defaultChatProvider } };
    }
    if (url === '/settings/agent-memories') return { data: [] };
    if (url === '/embedding/status') {
      return { data: { configured: Boolean(mocks.embeddingProviderName), provider_name: mocks.embeddingProviderName, chunks: { total: 0, embedded: 0 }, memories: { total: 0, embedded: 0 } } };
    }
    throw new Error('Unexpected synthetic API request');
  });
  mocks.post.mockResolvedValue({ data: { success: true, category: 'ok' } });
  mocks.updateSettings.mockResolvedValue(undefined);
});

describe('Settings provider management integration', () => {
  it('preserves the A1 memory section and other provider metadata while connecting model drafts to provider tests', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await screen.findByText('No agent memories yet.');
    expect(screen.getByRole('heading', { name: 'Agent memories' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Provider', { selector: '#agent-provider' }), { target: { value: 'deepseek' } });
    fireEvent.change(screen.getByLabelText('Model', { selector: '#agent-model' }), { target: { value: 'synthetic-deepseek-model' } });
    fireEvent.change(screen.getByLabelText('Base URL (optional)'), { target: { value: 'https://synthetic-deepseek.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Provider Settings' }));
    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledWith({
      active_provider: 'deepseek',
      ai_providers: {
        anthropic: { default_model: 'synthetic-anthropic-model', base_url: undefined },
        generic: { default_model: 'synthetic-generic-model', base_url: 'https://synthetic-generic.invalid' },
        deepseek: { default_model: 'synthetic-deepseek-model', base_url: 'https://synthetic-deepseek.invalid' },
      },
    }));

    const deepseek = within(screen.getByRole('heading', { name: 'DeepSeek' }).closest('li')!);
    fireEvent.click(deepseek.getByRole('button', { name: 'Test connection' }));
    await deepseek.findByText('Connection successful.');
    expect(mocks.post).toHaveBeenLastCalledWith('/settings/providers/deepseek/test-connection', {
      model: 'synthetic-deepseek-model', base_url: 'https://synthetic-deepseek.invalid',
    });

    const voyage = within(screen.getByRole('heading', { name: 'Voyage AI' }).closest('li')!);
    fireEvent.click(voyage.getByRole('button', { name: 'Test connection' }));
    await voyage.findByText('Connection successful.');
    expect(mocks.post).toHaveBeenLastCalledWith('/settings/providers/voyage/test-connection', { model: 'voyage-4', base_url: undefined });
  });

  it('shows and saves the providers actually in effect when none were chosen', async () => {
    mocks.userSettings = {};
    mocks.defaultChatProvider = 'deepseek';
    mocks.embeddingProviderName = 'dashscope';
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const provider = screen.getByLabelText('Provider', { selector: '#agent-provider' }) as HTMLSelectElement;
    await waitFor(() => expect(provider.value).toBe('deepseek'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Provider Settings' }));
    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ active_provider: 'deepseek' })));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledWith({
      embedding_provider: 'dashscope', embedding_model: 'text-embedding-v4',
    }));
  });

  it('keeps an explicit provider choice even when another provider is the keyed default', async () => {
    mocks.defaultChatProvider = 'deepseek';
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await screen.findByText('No agent memories yet.');
    expect((screen.getByLabelText('Provider', { selector: '#agent-provider' }) as HTMLSelectElement).value).toBe('anthropic');
  });
});
