import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Target,
  BookOpen,
  Layers,
  RotateCcw,
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
import styles from './AppLayout.module.css';

const navItems = [
  { to: '/', icon: Home, label: 'Daily Brief' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/decks', icon: Layers, label: 'Decks' },
  { to: '/review', icon: RotateCcw, label: 'Review' },
  { to: '/settings', icon: Settings, label: 'Settings' },
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

  return (
    <div className={styles.layout}>
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
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              {sidebarOpen && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}

          {sidebarOpen && (
            <>
              <div className={styles.sectionLabel}>
                <span>Courses</span>
                <button onClick={() => openModal('course-create')}>
                  <Plus size={14} />
                </button>
              </div>
              {courses.map((course) => (
                <button
                  key={course.id}
                  className={styles.courseItem}
                  onClick={() => navigate(`/courses`)}
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
                  No courses yet
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
