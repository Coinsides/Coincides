import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Target,
  BookOpen,
  Layers,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  GraduationCap,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTagStore } from '@/stores/tagStore';
import { useAuthStore } from '@/stores/authStore';
import Onboarding from '@/components/Onboarding/Onboarding';
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.dailyBrief' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/goals', icon: Target, labelKey: 'nav.goals' },
  { to: '/courses', icon: BookOpen, labelKey: 'nav.courses' },
  { to: '/decks', icon: Layers, labelKey: 'nav.decks' },
  { to: '/statistics', icon: BarChart3, labelKey: 'nav.statistics' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openModal = useUIStore((s) => s.openModal);
  const courses = useCourseStore((s) => s.courses);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const fetchTags = useTagStore((s) => s.fetchTags);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const navigate = useNavigate();

  const toggleAgentPanel = useUIStore((s) => s.toggleAgentPanel);
  const toggleShortcutsPanel = useUIStore((s) => s.toggleShortcutsPanel);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadUser();
    fetchCourses();
    fetchTags();
  }, []);

  useEffect(() => {
    if (user?.settings?.theme) {
      document.documentElement.setAttribute('data-theme', user.settings.theme);
    }
  }, [user?.settings?.theme]);

  // Sync language setting
  useEffect(() => {
    if (user?.settings?.language && i18n.language !== user.settings.language) {
      i18n.changeLanguage(user.settings.language);
    }
  }, [user?.settings?.language]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'j') {
        e.preventDefault();
        toggleAgentPanel();
      } else if (mod && e.key === 't') {
        e.preventDefault();
        openModal('task-create');
      } else if (mod && e.key === 'k') {
        e.preventDefault();
        openModal('card-create');
      } else if (e.key === '?' && !mod) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        toggleShortcutsPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAgentPanel, openModal, toggleShortcutsPanel]);

  const showOnboarding = user && !user.onboarding_completed;

  return (
    <div className={styles.layout}>
      {showOnboarding && <Onboarding />}
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div className={styles.brand}>
              <div className={styles.brandIcon}>
                <GraduationCap size={14} color="white" />
              </div>
              <span className={styles.brandName}>Coincides</span>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={toggleSidebar}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              {sidebarOpen && <span className={styles.navLabel}>{t(labelKey)}</span>}
            </NavLink>
          ))}

          {sidebarOpen && (
            <>
              <div className={styles.sectionLabel}>
                <span>{t('sidebar.courses')}</span>
                <button onClick={() => openModal('course-create')}>
                  <Plus size={14} />
                </button>
              </div>
              {courses.map((course) => (
                <button
                  key={course.id}
                  className={styles.courseItem}
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <span
                    className={styles.courseDot}
                    style={{ backgroundColor: course.color }}
                  />
                  <span>{course.name}</span>
                </button>
              ))}
              {courses.length === 0 && (
                <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('sidebar.noCourses')}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
