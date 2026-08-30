import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Tags, FileText, FolderOpen, MoreHorizontal } from 'lucide-react';
import { useCourseStore } from '@/stores/courseStore';
import type { CourseWithRecentNote } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import TagGroupManager from '@/components/TagGroupManager/TagGroupManager';
import type { Course } from '@shared/types';
import { ProjectDeleteDialog } from './ProjectDeleteDialog';
import styles from './Courses.module.css';

interface ProjectCardProps {
  course: CourseWithRecentNote;
  onOpen: () => void;
  onOpenNote: (noteId: string) => void;
  onOpenSources: () => void;
  onOpenTags: () => void;
  onEdit: () => void;
  onTrash: () => void;
}

interface ProjectMenuState {
  x: number;
  y: number;
  returnFocus: HTMLElement | null;
}

const PROJECT_MENU_WIDTH = 200;
const PROJECT_MENU_HEIGHT = 224;
const PROJECT_MENU_GUTTER = 8;

function calendarDayNumber(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
}

export function formatProjectRelativeTime(value: string, now = new Date()): string {
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return '';

  const daysAgo = calendarDayNumber(now) - calendarDayNumber(updatedAt);
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo} days ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() === updatedAt.getFullYear() ? undefined : 'numeric',
  }).format(updatedAt);
}

export function ProjectCard({
  course,
  onOpen,
  onOpenNote,
  onOpenSources,
  onOpenTags,
  onEdit,
  onTrash,
}: ProjectCardProps) {
  const recentNote = course.recent_note ?? null;
  const recentTitle = recentNote?.title.trim() || 'Untitled';
  const excerpt = recentNote?.excerpt?.trim() || '';
  const [menu, setMenu] = useState<ProjectMenuState | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const projectNameRef = useRef<HTMLButtonElement>(null);

  const openProjectMenu = (x: number, y: number, returnFocus: HTMLElement | null) => {
    const viewportWidth = typeof window === 'undefined' ? PROJECT_MENU_WIDTH : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? PROJECT_MENU_HEIGHT : window.innerHeight;
    const maxX = Math.max(PROJECT_MENU_GUTTER, viewportWidth - PROJECT_MENU_WIDTH - PROJECT_MENU_GUTTER);
    const maxY = Math.max(PROJECT_MENU_GUTTER, viewportHeight - PROJECT_MENU_HEIGHT - PROJECT_MENU_GUTTER);

    setMenu({
      x: Math.min(Math.max(x, PROJECT_MENU_GUTTER), maxX),
      y: Math.min(Math.max(y, PROJECT_MENU_GUTTER), maxY),
      returnFocus,
    });
  };

  const runMenuAction = (action: () => void) => {
    setMenu(null);
    action();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  };

  useEffect(() => {
    if (!menu) return;

    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      menu.returnFocus?.focus();
      setMenu(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menu]);

  const menuLayer = menu && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${course.name}`}
          className={styles.projectMenu}
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={handleMenuKeyDown}
        >
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => runMenuAction(onOpen)}>
            <FolderOpen size={14} aria-hidden="true" />
            Open
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => runMenuAction(onOpenSources)}>
            <FileText size={14} aria-hidden="true" />
            Sources
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => runMenuAction(onOpenTags)}>
            <Tags size={14} aria-hidden="true" />
            Tags
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => runMenuAction(onEdit)}>
            <Edit2 size={14} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={styles.projectMenuDanger}
            onClick={() => runMenuAction(onTrash)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Move to Trash
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <article
        className={`${styles.card} ${menu ? styles.cardMenuOpen : ''}`}
        aria-label={`${course.name} project`}
        data-testid={`project-card-${course.id}`}
        onClick={onOpen}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openProjectMenu(event.clientX, event.clientY, projectNameRef.current);
        }}
      >
        <div className={styles.cardBody}>
          <div className={styles.cardHeading}>
            <span
              className={styles.cardColorDot}
              style={{ backgroundColor: course.color }}
              aria-hidden="true"
            />
            <button
              ref={projectNameRef}
              type="button"
              className={styles.cardName}
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              {course.name}
            </button>
            <button
              type="button"
              className={styles.menuTrigger}
              aria-label={`More actions for ${course.name}`}
              aria-haspopup="menu"
              aria-expanded={menu !== null}
              aria-controls={menu ? menuId : undefined}
              onClick={(event) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                openProjectMenu(rect.right - PROJECT_MENU_WIDTH, rect.bottom + 6, event.currentTarget);
              }}
            >
              <MoreHorizontal size={17} aria-hidden="true" />
            </button>
          </div>

          {(course.code || course.semester) && (
            <div className={styles.cardDetails}>
              {course.code && <span className={styles.cardCode}>{course.code}</span>}
              {course.semester && <span className={styles.cardSemester}>{course.semester}</span>}
            </div>
          )}

          {recentNote ? (
            <>
              <button
                type="button"
                className={styles.continueRow}
                aria-label={`Continue · ${recentTitle}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenNote(recentNote.id);
                }}
              >
                <span className={styles.continueLabel}>
                  <span aria-hidden="true">▶</span>
                  <span>
                    <span>Continue · </span>
                    <span>{recentTitle}</span>
                  </span>
                </span>
                <time dateTime={recentNote.updated_at} className={styles.continueTime}>
                  {formatProjectRelativeTime(recentNote.updated_at)}
                </time>
              </button>
              {excerpt && (
                <div className={styles.cardExcerpt} data-testid="project-card-excerpt">
                  {excerpt}
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className={styles.emptyProject}
              aria-label="Empty project — Drop in a source to begin"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              <span className={styles.emptyProjectTitle}>Empty project</span>
              <span>Drop in a source to begin</span>
            </button>
          )}
        </div>
      </article>
      {menuLayer}
    </>
  );
}

export default function CoursesPage() {
  const courses = useCourseStore((s) => s.courses);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const modal = useUIStore((s) => s.modal);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);

  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const handleDelete = async (action: 'delete_projection' | 'move_to_home') => {
    if (!confirmDelete) return;
    try {
      await deleteCourse(confirmDelete.id, action);
      addToast('success', 'Project deleted');
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Notebook workspace</div>
          <div className={styles.title}>Projects</div>
          <p className={styles.subtitle}>
            Organize course material, research packs, reports, and source-backed notes in one focused place.
          </p>
        </div>
        <button className={styles.primaryAction} onClick={() => openModal('course-create')}>
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div className={styles.grid}>
        {courses.map((course) => (
          <ProjectCard
            key={course.id}
            course={course}
            onOpen={() => navigate(`/projects/${course.id}`)}
            onOpenNote={(noteId) => navigate(`/notes/${noteId}`)}
            onOpenSources={() => navigate(`/projects/${course.id}?focus=sources`)}
            onOpenTags={() => openModal('tag-group-manager', {
              courseId: course.id,
              courseName: course.name,
            })}
            onEdit={() => openModal('course-edit', { course })}
            onTrash={() => setConfirmDelete(course)}
          />
        ))}

        <button className={styles.addCard} onClick={() => openModal('course-create')}>
          <Plus size={20} />
          Add Project
        </button>
      </div>

      {courses.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Start with a project</div>
          <p>
            A project can be a course, a research folder, a report workspace, or any focused collection of notes and sources.
          </p>
        </div>
      )}

      {confirmDelete && (
        <ProjectDeleteDialog
          projectId={confirmDelete.id}
          projectName={confirmDelete.name}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Tag Group Manager modal */}
      {modal?.type === 'tag-group-manager' && <TagGroupManager />}

    </div>
  );
}
