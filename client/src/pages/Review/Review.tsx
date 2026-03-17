import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useReviewStore } from '@/stores/reviewStore';
import { useUIStore } from '@/stores/uiStore';
import CardFlip from '@/components/CardFlip/CardFlip';
import styles from './Review.module.css';

const ratingConfig = [
  { value: 1, label: 'Again', color: '#ef4444' },
  { value: 2, label: 'Hard', color: '#f59e0b' },
  { value: 3, label: 'Good', color: '#22c55e' },
  { value: 4, label: 'Easy', color: '#3b82f6' },
];

export default function ReviewPage() {
  const navigate = useNavigate();
  const {
    dueCards, currentIndex, sessionActive, sessionResults,
    loading, fetchDueCards, rateCard, startSession, nextCard, endSession,
  } = useReviewStore();
  const addToast = useUIStore((s) => s.addToast);

  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    if (dueCards.length > 0) {
      startSession();
    } else {
      fetchDueCards().then(() => {
        startSession();
      });
    }
  }, []);

  const currentCard = dueCards[currentIndex];
  const isFinished = sessionActive && currentIndex >= dueCards.length;

  const handleRate = async (value: number) => {
    if (!currentCard) return;
    try {
      await rateCard(currentCard.id, value);
      setFlipped(false);
      setRating(false);
      if (currentIndex + 1 >= dueCards.length) {
        // Session done — show summary
      }
      nextCard();
    } catch {
      addToast('error', 'Failed to rate card');
    }
  };

  const handleFlip = (isFlipped: boolean) => {
    setFlipped(isFlipped);
    if (isFlipped) setRating(true);
  };

  const handleFinish = () => {
    endSession();
    navigate('/decks');
  };

  if (loading && dueCards.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading review cards...</div>
      </div>
    );
  }

  if (!loading && dueCards.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <RotateCcw size={40} strokeWidth={1} />
          <h3>All caught up!</h3>
          <p>No cards are due for review right now.</p>
          <button className={styles.backBtn} onClick={() => navigate('/decks')}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // Session summary
  if (isFinished) {
    const ratingCounts = [0, 0, 0, 0, 0]; // index 1-4
    sessionResults.forEach((r) => { ratingCounts[r.rating]++; });

    return (
      <div className={styles.page}>
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Session Complete</h2>
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{sessionResults.length}</div>
              <div className={styles.statLabel}>Cards Reviewed</div>
            </div>
            {ratingConfig.map((rc) => (
              <div key={rc.value} className={styles.statCard}>
                <div className={styles.statValue} style={{ color: rc.color }}>
                  {ratingCounts[rc.value]}
                </div>
                <div className={styles.statLabel}>{rc.label}</div>
              </div>
            ))}
          </div>
          <button className={styles.finishBtn} onClick={handleFinish}>
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.navBackBtn} onClick={() => navigate('/decks')}>
          <ArrowLeft size={16} />
        </button>
        <div className={styles.progress}>
          <div className={styles.progressText}>
            Card {currentIndex + 1} of {dueCards.length}
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${((currentIndex) / dueCards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      {currentCard && (
        <div className={styles.cardArea}>
          <div className={styles.deckLabel}>{currentCard.deck_name}</div>
          <CardFlip
            card={currentCard}
            onFlip={handleFlip}
          />
        </div>
      )}

      {/* Rating buttons */}
      <div className={`${styles.ratingBar} ${rating ? styles.visible : ''}`}>
        {ratingConfig.map((rc) => (
          <button
            key={rc.value}
            className={styles.ratingBtn}
            style={{ backgroundColor: rc.color + '18', color: rc.color, borderColor: rc.color + '40' }}
            onClick={() => handleRate(rc.value)}
          >
            {rc.label}
          </button>
        ))}
      </div>

      {!flipped && (
        <div className={styles.flipPrompt}>Click the card to reveal the answer</div>
      )}
    </div>
  );
}
