import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Upload, MessageSquare, X, ChevronRight, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Onboarding.module.css';

const STEPS = [
  {
    icon: GraduationCap,
    title: 'Welcome to Coincides!',
    description: 'What are you studying? Start by creating a course — it\'s where all your materials, goals, and tasks live.',
    action: 'Create a Course',
    route: '/courses',
  },
  {
    icon: Upload,
    title: 'Add Your Materials',
    description: 'Upload textbooks, slides, or notes into your course. The AI can generate flashcards and study plans from them.',
    action: 'Go to Courses',
    route: '/courses',
  },
  {
    icon: MessageSquare,
    title: 'Chat with Mr. Zero',
    description: 'Press Ctrl+J (or Cmd+J) to open the AI assistant. Tell it your learning goal, and it will help you break it down into actionable steps.',
    action: 'Open AI Assistant',
    route: null, // opens agent panel instead
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const toggleAgentPanel = useUIStore((s) => s.toggleAgentPanel);
  const openModal = useUIStore((s) => s.openModal);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleAction = () => {
    if (currentStep.route) {
      navigate(currentStep.route);
      if (step === 0) {
        openModal('course-create');
      }
    } else {
      toggleAgentPanel();
    }
    handleNext();
  };

  const handleNext = () => {
    if (isLast) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const Icon = currentStep.icon;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <button className={styles.skipBtn} onClick={handleSkip} title="Skip onboarding">
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div className={styles.steps}>
          {STEPS.map((_, i) => (
            <div key={i} className={`${styles.stepDot} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`} />
          ))}
        </div>

        {/* Content */}
        <div className={styles.iconWrap}>
          <Icon size={32} />
        </div>
        <h2 className={styles.title}>{currentStep.title}</h2>
        <p className={styles.description}>{currentStep.description}</p>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleAction}>
            {currentStep.action}
            <ChevronRight size={16} />
          </button>
          <button className={styles.textBtn} onClick={handleNext}>
            {isLast ? 'Finish' : 'Skip this step'}
          </button>
        </div>
      </div>
    </div>
  );
}
