import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { user, updateSettings, logout } = useAuthStore();
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const settings = user?.settings || {};
  const [agentName, setAgentName] = useState(settings.agent_name || 'Mr. Zero');

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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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
            <span className={styles.rowLabel}>AI Provider</span>
            <span className={styles.placeholder}>Available in a future update</span>
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
