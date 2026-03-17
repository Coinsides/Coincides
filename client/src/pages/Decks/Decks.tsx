import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { useDeckStore } from '@/stores/deckStore';
import { useCourseStore } from '@/stores/courseStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Decks.module.css';

export default function DecksPage() {
  const { decks, loading, fetchDecks, deleteDeck } = useDeckStore();
  const courses = useCourseStore((s) => s.courses);
  const openModal = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const [courseFilter, setCourseFilter] = useState('');

  useEffect(() => {
    fetchDecks(courseFilter || undefined);
  }, [courseFilter]);

  const getCourse = (id: string) => courses.find((c) => c.id === id);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDeck(id);
      addToast('success', 'Deck deleted');
    } catch {
      addToast('error', 'Failed to delete deck');
    }
  };

  const handleEdit = (e: React.MouseEvent, deck: typeof decks[0]) => {
    e.stopPropagation();
    openModal('deck-edit', { deck });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Card Decks</div>
        <div className={styles.headerRight}>
          <select
            className={styles.filterSelect}
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className={styles.addBtn} onClick={() => openModal('deck-create')}>
            <Plus size={14} />
            New Deck
          </button>
        </div>
      </div>

      {loading && decks.length === 0 ? (
        <div className={styles.loading}>Loading decks...</div>
      ) : decks.length === 0 ? (
        <div className={styles.empty}>
          <Layers size={40} strokeWidth={1} />
          <h3>No decks yet</h3>
          <p>Create your first card deck to start adding flashcards.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((deck) => {
            const course = getCourse(deck.course_id);
            return (
              <div
                key={deck.id}
                className={styles.deckCard}
                onClick={() => navigate(`/decks/${deck.id}`)}
              >
                <div className={styles.deckTop}>
                  <div className={styles.deckName}>{deck.name}</div>
                  <div className={styles.deckActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={(e) => handleEdit(e, deck)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className={styles.iconBtnDanger}
                      onClick={(e) => handleDelete(e, deck.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {deck.description && (
                  <div className={styles.deckDesc}>{deck.description}</div>
                )}
                <div className={styles.deckMeta}>
                  <span className={styles.cardCount}>{deck.card_count} cards</span>
                  {course && (
                    <span
                      className={styles.courseBadge}
                      style={{ backgroundColor: course.color + '18', color: course.color }}
                    >
                      {course.code || course.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
