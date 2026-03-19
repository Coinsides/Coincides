import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import api from '@/services/api';
import styles from './Settings.module.css';

const providerOptions = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI Compatible' },
];

const defaultModels: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

const embeddingProviderOptions = [
  { value: 'voyage', label: 'Voyage AI' },
];

const embeddingModelOptions: Record<string, Array<{ value: string; label: string }>> = {
  voyage: [
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
  const [apiKey, setApiKey] = useState(settings.ai_providers?.[activeProvider]?.api_key || '');
  const [model, setModel] = useState(settings.ai_providers?.[activeProvider]?.default_model || defaultModels[activeProvider] || '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTheme = async (theme: 'dark' | 'light') => {
    try {
      await updateSettings({ theme });
      document.documentElement.setAttribute('data-theme', theme);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      addToast('error', 'Failed to update settings');
    }
  };

  const handleToggle = async (key: 'daily_status_enabled' | 'keyboard_shortcuts_enabled') => {
    try {
      await updateSettings({ [key]: !settings[key] });
    } catch (err) {
      console.error('Failed to save API keys:', err);
      addToast('error', 'Failed to update settings');
    }
  };

  const handleAgentNameBlur = async () => {
    if (agentName.trim() !== (settings.agent_name || 'Mr. Zero')) {
      try {
        await updateSettings({ agent_name: agentName.trim() });
        addToast('success', 'Agent name updated');
      } catch (err) {
        console.error('Failed to test Anthropic key:', err);
        addToast('error', 'Failed to update');
      }
    }
  };

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider);
    setApiKey(settings.ai_providers?.[provider]?.api_key || '');
    setModel(settings.ai_providers?.[provider]?.default_model || defaultModels[provider] || '');
  };

  const handleSaveProvider = async () => {
    setSaving(true);
    try {
      await updateSettings({
        active_provider: activeProvider,
        ai_providers: {
          ...settings.ai_providers,
          [activeProvider]: {
            api_key: apiKey,
            default_model: model || defaultModels[activeProvider],
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
  const [embApiKey, setEmbApiKey] = useState(settings.embedding_api_key || '');
  const [embModel, setEmbModel] = useState(settings.embedding_model || 'voyage-3');
  const [showEmbKey, setShowEmbKey] = useState(false);
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
        embedding_api_key: embApiKey,
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

  const hasApiKey = !!settings.ai_providers?.[activeProvider]?.api_key;
  const hasEmbApiKey = !!settings.embedding_api_key;

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
                中文
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <span className={styles.rowLabel}>Provider</span>
            <div className={styles.providerSelect}>
              {providerOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.themeBtn} ${activeProvider === opt.value ? styles.active : ''}`}
                  onClick={() => handleProviderChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>
              API Key
              {hasApiKey && <span className={styles.connectedDot} title="Connected" />}
            </span>
            <div className={styles.keyInput}>
              <input
                className={styles.inlineInput}
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button className={styles.eyeBtn} onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Model</span>
            <input
              className={styles.inlineInput}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={defaultModels[activeProvider]}
            />
          </div>
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
            <span className={styles.rowLabel}>
              API Key
              {hasEmbApiKey && <span className={styles.connectedDot} title="Connected" />}
            </span>
            <div className={styles.keyInput}>
              <input
                className={styles.inlineInput}
                type={showEmbKey ? 'text' : 'password'}
                value={embApiKey}
                onChange={(e) => setEmbApiKey(e.target.value)}
                placeholder="pa-..."
              />
              <button className={styles.eyeBtn} onClick={() => setShowEmbKey(!showEmbKey)}>
                {showEmbKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
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
