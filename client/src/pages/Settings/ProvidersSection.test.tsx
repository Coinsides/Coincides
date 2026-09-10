import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProvidersSection, { type ProviderCredentialStatus } from './ProvidersSection';

const requests = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: requests }));

const path = '/settings/providers';
let stored: ProviderCredentialStatus[];

function status(provider: string, source: ProviderCredentialStatus['source'] = 'none', tail = ''): ProviderCredentialStatus {
  return {
    provider, source, has_key: source !== 'none', has_local_key: source === 'local',
    masked_key: source === 'none' ? null : `****${tail}`,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  stored = ['anthropic', 'openai', 'generic', 'deepseek', 'dashscope', 'voyage'].map((provider) => status(provider));
  requests.get.mockImplementation(async () => ({ data: { providers: stored.map((entry) => ({ ...entry })) } }));
  requests.put.mockImplementation(async (url: string, { api_key }: { api_key: string }) => {
    const provider = url.slice(path.length + 1);
    const updated = status(provider, 'local', api_key.slice(-4));
    stored = stored.map((entry) => entry.provider === provider ? updated : entry);
    return { data: { ...updated } };
  });
  requests.delete.mockImplementation(async (url: string) => {
    const provider = url.slice(path.length + 1);
    const updated = provider === 'anthropic' ? status(provider, 'environment', 'env1') : status(provider);
    stored = stored.map((entry) => entry.provider === provider ? updated : entry);
    return { data: { ...updated } };
  });
  requests.post.mockResolvedValue({ data: { success: true, category: 'ok' } });
});

async function providerRow(label: string) {
  const heading = await screen.findByRole('heading', { name: label });
  return within(heading.closest('li')!);
}

describe('Settings provider credential controls', () => {
  it('lists the provider roster and saves then replaces a synthetic key with synchronized masked status', async () => {
    const onCredentialsChange = vi.fn();
    render(<ProvidersSection onCredentialsChange={onCredentialsChange} />);
    expect(screen.getByRole('status').textContent).toBe('Loading providers...');
    const row = await providerRow('Anthropic');
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(row.getByText('No key configured')).toBeTruthy();
    const input = row.getByLabelText('Anthropic API key') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'synthetic-key-not-real-first-1111' } });
    fireEvent.click(row.getByRole('button', { name: 'Save key' }));
    await row.findByText('****1111 · Saved on this machine');
    expect(requests.put).toHaveBeenLastCalledWith(`${path}/anthropic`, { api_key: 'synthetic-key-not-real-first-1111' });
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'synthetic-key-not-real-replacement-2222' } });
    fireEvent.click(row.getByRole('button', { name: 'Save key' }));
    await row.findByText('****2222 · Saved on this machine');
    expect(input.value).toBe('');
    expect(onCredentialsChange).toHaveBeenCalledTimes(2);
  });

  it('updates Clear to environment fallback or no key using the returned effective status', async () => {
    stored[0] = status('anthropic', 'local', '1111');
    stored[1] = status('openai', 'local', '2222');
    render(<ProvidersSection />);
    const anthropic = await providerRow('Anthropic');
    fireEvent.click(anthropic.getByRole('button', { name: 'Clear' }));
    await anthropic.findByText('****env1 · Environment fallback');
    expect(anthropic.getByRole('status').textContent).toBe('Local key cleared. Using environment fallback.');
    expect((anthropic.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(true);
    expect((anthropic.getByRole('button', { name: 'Test connection' }) as HTMLButtonElement).disabled).toBe(false);

    const openai = await providerRow('OpenAI');
    fireEvent.click(openai.getByRole('button', { name: 'Clear' }));
    await openai.findByText('No key configured');
    expect(openai.getByRole('status').textContent).toBe('Local key cleared. No key configured.');
    expect((openai.getByRole('button', { name: 'Test connection' }) as HTMLButtonElement).disabled).toBe(true);
    expect(requests.delete).toHaveBeenCalledTimes(2);
  });

  it('tests a saved key with the current model settings and presents success or a recognizable failure', async () => {
    stored[2] = status('generic', 'local', '1111');
    const connectionSettings = { generic: { model: 'synthetic-model', base_url: 'https://synthetic-provider.invalid' } };
    render(<ProvidersSection connectionSettings={connectionSettings} />);
    const row = await providerRow('OpenAI Compatible');
    const input = row.getByLabelText('OpenAI Compatible API key');
    fireEvent.change(input, { target: { value: 'synthetic-key-not-real-draft-2222' } });
    expect(row.getByText(/Save the new key before testing/)).toBeTruthy();
    expect((row.getByRole('button', { name: 'Test connection' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(row.getByRole('button', { name: 'Save key' }));
    await row.findByText('****2222 · Saved on this machine');

    fireEvent.click(row.getByRole('button', { name: 'Test connection' }));
    await row.findByText('Connection successful.');
    expect(requests.post).toHaveBeenLastCalledWith(`${path}/generic/test-connection`, connectionSettings.generic);
    requests.post.mockResolvedValueOnce({ data: { success: false, category: 'authentication', http_status: 401 } });
    fireEvent.click(row.getByRole('button', { name: 'Test connection' }));
    expect((await row.findByRole('alert')).textContent).toBe('Authentication failed. Check the key and try again.');
  });

  it('retries a failed status request and retains a draft when a save fails', async () => {
    requests.get.mockRejectedValueOnce(new Error('Synthetic request failure'));
    requests.put.mockRejectedValueOnce(new Error('Synthetic request failure'));
    render(<ProvidersSection />);
    expect((await screen.findByRole('alert')).textContent).toBe('Could not load provider settings.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const row = await providerRow('Voyage AI');
    const input = row.getByLabelText('Voyage AI API key') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'synthetic-key-not-real-voyage-3333' } });
    fireEvent.click(row.getByRole('button', { name: 'Save key' }));
    expect((await row.findByRole('alert')).textContent).toBe('Could not save the key. Try saving again.');
    expect(input.value).toBe('synthetic-key-not-real-voyage-3333');
    fireEvent.click(row.getByRole('button', { name: 'Save key' }));
    await row.findByText('****3333 · Saved on this machine');
    await waitFor(() => expect(row.queryByRole('alert')).toBeNull());
  });
});
