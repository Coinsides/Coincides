import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  NotebookText,
  LibraryBig,
  Star,
  Clock3,
  Boxes,
  ListChecks,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useCourseStore } from '@/stores/courseStore';
import { useTagStore } from '@/stores/tagStore';
import { useAuthStore } from '@/stores/authStore';
import Onboarding from '@/components/Onboarding/Onboarding';
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/projects', icon: BookOpen, labelKey: 'nav.projects' },
  { to: '/sources', icon: LibraryBig, labelKey: 'nav.sources' },
  { to: '/group-gallery', icon: Boxes, label: 'Group Gallery' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function AppLayout() {
  const location = useLocation();
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
  const favoriteProjects = courses.slice(0, 3);
  const recentProjects = [...courses].slice(-4).reverse();
  const contentGroupWorkspace = location.pathname.startsWith('/group-gallery');

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
    <div className={`${styles.layout} ${contentGroupWorkspace ? styles.contentGroupWorkspace : ''}`}>
      {showOnboarding && <Onboarding />}
      {/* Sidebar */}
      {!contentGroupWorkspace && (
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div className={styles.brand}>
              <div className={styles.brandIcon}>
                <NotebookText size={14} color="white" />
              </div>
              <span className={styles.brandName}>Coincides</span>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={toggleSidebar}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, labelKey, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              {sidebarOpen && <span className={styles.navLabel}>{label ?? (labelKey ? t(labelKey) : '')}</span>}
            </NavLink>
          ))}

          {sidebarOpen ? <div className={styles.sectionLabel}><span>Utilities</span></div> : null}
          <NavLink
            to="/tool-receipts"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
            title="Tool Receipts"
          >
            <ListChecks size={18} />
            {sidebarOpen ? <span className={styles.navLabel}>Tool Receipts</span> : null}
          </NavLink>

          {sidebarOpen && (
            <>
              <div className={styles.sectionLabel}>
                <span>{t('sidebar.projects')}</span>
                <button onClick={() => openModal('course-create')}>
                  <Plus size={14} />
                </button>
              </div>
              {courses.map((course) => (
                <button
                  key={course.id}
                  className={styles.courseItem}
                  onClick={() => navigate(`/projects/${course.id}`)}
                >
                  <span
                    className={styles.courseDot}
                    style={{ backgroundColor: course.color }}
                  />
                  <span>{course.name}</span>
                </button>
              ))}
              {courses.length === 0 && (
                <div className={styles.emptyHint}>{t('sidebar.noProjects')}</div>
              )}

              <div className={styles.sectionLabel}>
                <span>{t('sidebar.favorites')}</span>
                <Star size={13} />
              </div>
              {favoriteProjects.length === 0 ? (
                <div className={styles.emptyHint}>{t('sidebar.noFavorites')}</div>
              ) : (
                favoriteProjects.map((project) => (
                  <button
                    key={`favorite-${project.id}`}
                    className={styles.utilityItem}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Star size={13} />
                    <span>{project.name}</span>
                  </button>
                ))
              )}

              <div className={styles.sectionLabel}>
                <span>{t('sidebar.recent')}</span>
                <Clock3 size={13} />
              </div>
              {recentProjects.length === 0 ? (
                <div className={styles.emptyHint}>{t('sidebar.noRecent')}</div>
              ) : (
                recentProjects.map((project) => (
                  <button
                    key={`recent-${project.id}`}
                    className={styles.utilityItem}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Clock3 size={13} />
                    <span>{project.name}</span>
                  </button>
                ))
              )}
            </>
          )}
        </nav>
      </aside>
      )}

      {/* Main content */}
      <main
        className={`${styles.main} ${contentGroupWorkspace ? styles.immersiveMain : ''}`}
        data-app-main-scroll="true"
      >
        <div
          className={`${styles.content} ${contentGroupWorkspace ? styles.immersiveContent : ''}`}
          data-app-content-shell="true"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
