import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import AgentMemoriesSection from './AgentMemoriesSection';
import ProvidersSection from './ProvidersSection';
import AppearanceSection from './AppearanceSection';
import styles from './Settings.module.css';

const providerOptions = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'generic', label: 'OpenAI Compatible' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'dashscope', label: 'DashScope' },
];

const defaultModels: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  generic: 'gpt-4o',
  deepseek: 'deepseek-chat',
  dashscope: 'qwen-plus',
};

const embeddingProviderOptions = [
  { value: 'voyage', label: 'Voyage AI' },
];

const embeddingModelOptions: Record<string, Array<{ value: string; label: string }>> = {
  voyage: [
    { value: 'voyage-4', label: 'voyage-4' },
    { value: 'voyage-3', label: 'voyage-3' },
    { value: 'voyage-3-lite', label: 'voyage-3-lite' },
    { value: 'voyage-3-large', label: 'voyage-3-large' },
  ],
};

interface EmbeddingStatus {
  configured: boolean;
  provider_name: string | null;
  chunks: { total: number; embedded: number };
  memories: { total: number; embedded: number };
}

export default function SettingsPage() {
  const { user, updateSettings, logout } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const { t, i18n } = useTranslation();
  const settings = user?.settings || {};
  const [agentName, setAgentName] = useState(settings.agent_name || 'Mr. Zero');
  const [activeProvider, setActiveProvider] = useState(settings.active_provider || 'anthropic');
  const [model, setModel] = useState(settings.ai_providers?.[activeProvider]?.default_model || defaultModels[activeProvider] || '');
  const [baseUrl, setBaseUrl] = useState(settings.ai_providers?.[activeProvider]?.base_url || '');
  const [saving, setSaving] = useState(false);

  const handleTheme = async (theme: 'dark' | 'light') => {
    try {
      await updateSettings({ theme });
      document.documentElement.setAttribute('data-theme', theme);
    } catch (err) {
      console.error('Failed to update theme:', err);
      addToast('error', 'Failed to update settings');
    }
  };

  const handleToggle = async (key: 'daily_status_enabled' | 'keyboard_shortcuts_enabled') => {
    try {
      await updateSettings({ [key]: !settings[key] });
    } catch (err) {
      console.error('Failed to update preferences:', err);
      addToast('error', 'Failed to update settings');
    }
  };

  const handleAgentNameBlur = async () => {
    if (agentName.trim() !== (settings.agent_name || 'Mr. Zero')) {
      try {
        await updateSettings({ agent_name: agentName.trim() });
        addToast('success', 'Agent name updated');
      } catch (err) {
        console.error('Failed to update agent name:', err);
        addToast('error', 'Failed to update');
      }
    }
  };

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider);
    setModel(settings.ai_providers?.[provider]?.default_model || defaultModels[provider] || '');
    setBaseUrl(settings.ai_providers?.[provider]?.base_url || '');
  };

  const handleSaveProvider = async () => {
    setSaving(true);
    try {
      await updateSettings({
        active_provider: activeProvider,
        ai_providers: {
          ...Object.fromEntries(Object.entries(settings.ai_providers || {}).map(([provider, config]) => [provider, {
            default_model: config.default_model,
            base_url: config.base_url,
          }])),
          [activeProvider]: {
            default_model: model || defaultModels[activeProvider],
            base_url: baseUrl.trim() || undefined,
          },
        },
      });
      addToast('success', 'AI provider settings saved');
    } catch (err) {
      console.error('Failed to save provider settings:', err);
      addToast('error', 'Failed to save provider settings');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Embedding provider state
  const [embProvider, setEmbProvider] = useState(settings.embedding_provider || 'voyage');
  const [embModel, setEmbModel] = useState(settings.embedding_model || 'voyage-4');
  const [savingEmb, setSavingEmb] = useState(false);
  const [embStatus, setEmbStatus] = useState<EmbeddingStatus | null>(null);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    fetchEmbeddingStatus();
  }, []);

  const fetchEmbeddingStatus = async () => {
    try {
      const res = await api.get('/embedding/status');
      setEmbStatus(res.data);
    } catch (err) {
      console.error('Failed to load embedding status:', err);
    }
  };

  const handleSaveEmbedding = async () => {
    setSavingEmb(true);
    try {
      await updateSettings({
        embedding_provider: embProvider,
        embedding_model: embModel,
      });
      addToast('success', 'Embedding provider settings saved');
      fetchEmbeddingStatus();
    } catch (err) {
      console.error('Failed to save embedding settings:', err);
      addToast('error', 'Failed to save embedding settings');
    }
    setSavingEmb(false);
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await api.post('/embedding/backfill');
      const { chunks_processed, memories_processed } = res.data;
      addToast('success', `Backfill complete: ${chunks_processed} chunks, ${memories_processed} memories`);
      fetchEmbeddingStatus();
    } catch (err) {
      console.error('Failed to backfill embeddings:', err);
      addToast('error', 'Backfill failed');
    }
    setBackfilling(false);
  };

  const connectionSettings = Object.fromEntries(providerOptions.map(({ value }) => {
    const saved = settings.ai_providers?.[value];
    return [value, {
      model: value === activeProvider ? model || defaultModels[value] : saved?.default_model || defaultModels[value],
      base_url: (value === activeProvider ? baseUrl.trim() : saved?.base_url) || undefined,
    }];
  }));
  connectionSettings[embProvider] = { model: embModel, base_url: undefined };

  return (
    <div className={styles.page}>
      <div className={styles.title}>Settings</div>

      {/* Profile */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Profile</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{user?.name || '—'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user?.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Appearance</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Theme</span>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${(settings.theme || 'dark') === 'dark' ? styles.active : ''}`}
                onClick={() => handleTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`${styles.themeBtn} ${settings.theme === 'light' ? styles.active : ''}`}
                onClick={() => handleTheme('light')}
              >
                Light
              </button>
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Language</span>
            <div className={styles.themeButtons}>
              <button
                className={`${styles.themeBtn} ${(settings.language || 'en') === 'en' ? styles.active : ''}`}
                onClick={async () => {
                  await updateSettings({ language: 'en' });
                  i18n.changeLanguage('en');
                }}
              >
                English
              </button>
              <button
                className={`${styles.themeBtn} ${settings.language === 'zh' ? styles.active : ''}`}
                onClick={async () => {
                  await updateSettings({ language: 'zh' });
                  i18n.changeLanguage('zh');
                }}
              >
                Chinese
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppearanceSection />

      {/* Agent */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>AI Agent</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Agent Name</span>
            <input
              className={styles.inlineInput}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              onBlur={handleAgentNameBlur}
              maxLength={50}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.rowLabel} htmlFor="agent-provider">Provider</label>
            <select
              id="agent-provider"
              className={styles.inlineInput}
              value={activeProvider}
              onChange={(event) => handleProviderChange(event.target.value)}
            >
              {providerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <label className={styles.rowLabel} htmlFor="agent-model">Model</label>
            <input
              id="agent-model"
              className={styles.inlineInput}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={defaultModels[activeProvider]}
            />
          </div>
          <div className={styles.row}>
            <label className={styles.rowLabel} htmlFor="agent-base-url">Base URL (optional)</label>
            <input
              id="agent-base-url"
              className={styles.inlineInput}
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="Provider default"
              aria-describedby="agent-base-url-help"
            />
          </div>
          <p id="agent-base-url-help" className={styles.providerHelp}>Use the base URL without /v1. Leave blank for the provider or environment default.</p>
          <div className={styles.row}>
            <span className={styles.rowLabel} />
            <button
              className={styles.saveProviderBtn}
              onClick={handleSaveProvider}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Provider Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Embedding Provider */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Embedding Provider</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Provider</span>
            <div className={styles.providerSelect}>
              {embeddingProviderOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.themeBtn} ${embProvider === opt.value ? styles.active : ''}`}
                  onClick={() => {
                    setEmbProvider(opt.value);
                    setEmbModel(embeddingModelOptions[opt.value]?.[0]?.value || '');
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Model</span>
            <select
              className={styles.inlineInput}
              value={embModel}
              onChange={(e) => setEmbModel(e.target.value)}
            >
              {(embeddingModelOptions[embProvider] || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {embStatus && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Status</span>
              <span className={styles.rowValue}>
                {embStatus.configured ? (
                  <>
                    <span className={styles.connectedDot} />
                    {' '}Chunks: {embStatus.chunks.embedded}/{embStatus.chunks.total} &middot; Memories: {embStatus.memories.embedded}/{embStatus.memories.total}
                  </>
                ) : (
                  'Not configured'
                )}
              </span>
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.rowLabel} />
            <div className={styles.embeddingActions}>
              <button
                className={styles.saveProviderBtn}
                onClick={handleSaveEmbedding}
                disabled={savingEmb}
              >
                {savingEmb ? 'Saving...' : 'Save'}
              </button>
              {embStatus && (embStatus.chunks.total > embStatus.chunks.embedded || embStatus.memories.total > embStatus.memories.embedded) && (
                <button
                  className={styles.backfillBtn}
                  onClick={handleBackfill}
                  disabled={backfilling || !embStatus.configured}
                >
                  {backfilling ? 'Processing...' : 'Backfill Embeddings'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProvidersSection connectionSettings={connectionSettings} onCredentialsChange={() => { void fetchEmbeddingStatus(); }} />

      <AgentMemoriesSection />

      {/* Preferences */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Preferences</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Daily energy status</span>
            <button
              className={`${styles.toggle} ${settings.daily_status_enabled !== false ? styles.active : ''}`}
              onClick={() => handleToggle('daily_status_enabled')}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Keyboard shortcuts</span>
            <button
              className={`${styles.toggle} ${settings.keyboard_shortcuts_enabled !== false ? styles.active : ''}`}
              onClick={() => handleToggle('keyboard_shortcuts_enabled')}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Account</div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
