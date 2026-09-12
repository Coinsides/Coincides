import { useEffect, useState } from 'react';
import api from '@/services/api';
import styles from './Settings.module.css';

export interface ProviderCredentialStatus {
  provider: string;
  has_key: boolean;
  masked_key: string | null;
  source: 'local' | 'environment' | 'none';
  has_local_key: boolean;
}

export interface ProviderConnectionSettings {
  model?: string;
  base_url?: string;
}

interface ConnectionResult {
  success: boolean;
  category: 'ok' | 'missing_key' | 'authentication' | 'rate_limit' | 'network' | 'timeout' | 'provider_error' | 'invalid_request';
  http_status?: number;
}

const providersPath = '/settings/providers';
const providerLabels: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  generic: 'OpenAI Compatible',
  deepseek: 'DeepSeek',
  dashscope: 'DashScope',
  voyage: 'Voyage AI',
};

const connectionMessages: Record<ConnectionResult['category'], string> = {
  ok: 'Connection successful.',
  missing_key: 'No key configured. Save a key, then test again.',
  authentication: 'Authentication failed. Check the key and try again.',
  rate_limit: 'Provider rate limit reached. Try again later.',
  network: 'Could not reach the provider. Check the connection and base URL.',
  timeout: 'Connection timed out. Try again.',
  provider_error: 'The provider returned an error. Try again later.',
  invalid_request: 'The provider could not accept the request. Check the model and base URL.',
};

interface Props {
  connectionSettings?: Record<string, ProviderConnectionSettings>;
  onCredentialsChange?: () => void;
}

interface ProviderRowProps extends Props {
  status: ProviderCredentialStatus;
  onStatusChange: (status: ProviderCredentialStatus) => void;
}

function ProviderRow({ status, connectionSettings, onStatusChange, onCredentialsChange }: ProviderRowProps) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'save' | 'clear' | 'test' | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const label = providerLabels[status.provider] || status.provider;
  const path = `${providersPath}/${encodeURIComponent(status.provider)}`;
  const hasDraft = draft.length > 0;

  const saveKey = async () => {
    if (busy || !draft.trim()) return;
    setBusy('save');
    setFeedback(null);
    try {
      const { data } = await api.put<ProviderCredentialStatus>(path, { api_key: draft.trim() });
      onStatusChange(data);
      setDraft('');
      setFeedback({ message: 'Key saved on this machine.', error: false });
      onCredentialsChange?.();
    } catch {
      setFeedback({ message: 'Could not save the key. Try saving again.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const clearKey = async () => {
    if (busy || !status.has_local_key) return;
    setBusy('clear');
    setFeedback(null);
    try {
      const { data } = await api.delete<ProviderCredentialStatus>(path);
      onStatusChange(data);
      setDraft('');
      setFeedback({
        message: data.source === 'environment'
          ? 'Local key cleared. Using environment fallback.'
          : 'Local key cleared. No key configured.',
        error: false,
      });
      onCredentialsChange?.();
    } catch {
      setFeedback({ message: 'Could not clear the local key. Try again.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async () => {
    if (busy || hasDraft || !status.has_key) return;
    setBusy('test');
    setFeedback(null);
    try {
      const { data } = await api.post<ConnectionResult>(`${path}/test-connection`, connectionSettings?.[status.provider] || {});
      setFeedback({ message: connectionMessages[data.category] || connectionMessages.provider_error, error: !data.success });
    } catch {
      setFeedback({ message: 'Could not complete the connection test. Try again.', error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className={styles.providerCredential} aria-labelledby={`provider-title-${status.provider}`} aria-busy={busy !== null}>
      <div className={styles.providerHeading}>
        <h3 id={`provider-title-${status.provider}`} className={styles.providerName}>{label}</h3>
        <span className={styles.providerStatus}>
          {status.has_key ? `${status.masked_key} · ${status.source === 'local' ? 'Saved on this machine' : 'Environment fallback'}` : 'No key configured'}
        </span>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void saveKey(); }}>
        <label className={styles.rowLabel} htmlFor={`provider-key-${status.provider}`}>{label} API key</label>
        <input
          id={`provider-key-${status.provider}`}
          className={`${styles.inlineInput} ${styles.providerKeyInput}`}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setFeedback(null); }}
          placeholder={status.has_key ? 'Enter a replacement key' : 'Enter an API key'}
          disabled={busy !== null}
          aria-describedby={`provider-help-${status.provider}`}
        />
        <div className={styles.providerActions}>
          <button type="submit" className={styles.saveProviderBtn} disabled={busy !== null || !draft.trim()}>
            {busy === 'save' ? 'Saving...' : 'Save key'}
          </button>
          <button type="button" className={styles.backfillBtn} onClick={() => void testConnection()} disabled={busy !== null || hasDraft || !status.has_key}>
            {busy === 'test' ? 'Testing...' : 'Test connection'}
          </button>
          <button type="button" className={styles.backfillBtn} onClick={() => void clearKey()} disabled={busy !== null || !status.has_local_key}>
            {busy === 'clear' ? 'Clearing...' : 'Clear'}
          </button>
        </div>
      </form>
      <p id={`provider-help-${status.provider}`} className={styles.providerHelp}>
        {hasDraft ? 'Save the new key before testing.' : 'Test connection uses the saved key and the current model settings.'}
        {status.source === 'environment' && ' Environment keys cannot be cleared here.'}
      </p>
      {feedback && <p className={feedback.error ? styles.memoryError : styles.providerFeedback} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
    </li>
  );
}

export default function ProvidersSection({ connectionSettings, onCredentialsChange }: Props) {
  const [providers, setProviders] = useState<ProviderCredentialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api.get<{ providers: ProviderCredentialStatus[] }>(providersPath)
      .then(({ data }) => { if (!cancelled) setProviders(data.providers); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadVersion]);

  return (
    <section className={styles.section} aria-labelledby="providers-title">
      <details className={styles.providerDetails}>
      <summary id="providers-title">AI Provider 凭据({providers.filter((provider) => provider.has_key).length} 已配置)</summary>
      <div className={styles.card} aria-busy={loading}>
        <p className={styles.providerDisclosure}>Keys stay on this machine in a plaintext file in the application data directory, separate from your notebook database.</p>
        <p className={styles.providerHelp}>Clear removes the local key; an environment key is used if available.</p>
        {loading ? (
          <p className={styles.placeholder} role="status">Loading providers...</p>
        ) : loadError ? (
          <div className={styles.memoryStatus}>
            <p className={styles.memoryError} role="alert">Could not load provider settings.</p>
            <button type="button" className={styles.backfillBtn} onClick={() => setLoadVersion((value) => value + 1)}>Retry</button>
          </div>
        ) : (
          <ul className={styles.memoryList}>
            {providers.map((status) => (
              <ProviderRow
                key={status.provider}
                status={status}
                connectionSettings={connectionSettings}
                onCredentialsChange={onCredentialsChange}
                onStatusChange={(updated) => setProviders((current) => current.map((entry) => entry.provider === updated.provider ? updated : entry))}
              />
            ))}
          </ul>
        )}
      </div>
      </details>
    </section>
  );
}
