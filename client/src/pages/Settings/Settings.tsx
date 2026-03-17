import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Settings.module.css';

const providerOptions = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI Compatible' },
];

const defaultModels: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
};

export default function SettingsPage() {
  const { user, updateSettings, logout } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

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
    } catch {
      addToast('error', 'Failed to update settings');
    }
  };

  const handleToggle = async (key: 'daily_status_enabled' | 'keyboard_shortcuts_enabled') => {
    try {
      await updateSettings({ [key]: !settings[key] });
    } catch {
      addToast('error', 'Failed to update settings');
    }
  };

  const handleAgentNameBlur = async () => {
    if (agentName.trim() !== (settings.agent_name || 'Mr. Zero')) {
      try {
        await updateSettings({ agent_name: agentName.trim() });
        addToast('success', 'Agent name updated');
      } catch {
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
    } catch {
      addToast('error', 'Failed to save provider settings');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const hasApiKey = !!settings.ai_providers?.[activeProvider]?.api_key;

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
