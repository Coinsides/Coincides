import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Clock, MessageSquare, X, ChevronRight, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './Onboarding.module.css';

interface StepConfig {
  icon: typeof GraduationCap;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  route: string | null;
  agentContext?: { type: string; data?: unknown };
}

const STEPS: StepConfig[] = [
  {
    icon: GraduationCap,
    titleKey: 'onboarding.welcome',
    descriptionKey: 'onboarding.step1Description',
    actionKey: 'onboarding.step1Action',
    route: '/courses',
  },
  {
    icon: Upload,
    titleKey: 'onboarding.step2Title',
    descriptionKey: 'onboarding.step2Description',
    actionKey: 'onboarding.step2Action',
    route: '/courses',
  },
  {
    icon: Clock,
    titleKey: 'onboarding.step3Title',
    descriptionKey: 'onboarding.step3Description',
    actionKey: 'onboarding.step3Action',
    route: '/calendar',
  },
  {
    icon: MessageSquare,
    titleKey: 'onboarding.step4Title',
    descriptionKey: 'onboarding.step4Description',
    actionKey: 'onboarding.step4Action',
    route: null,
    agentContext: { type: 'l1_onboarding', data: { isNewUser: true } },
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const openAgentWithContext = useUIStore((s) => s.openAgentWithContext);
  const openModal = useUIStore((s) => s.openModal);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleAction = () => {
    if (currentStep.route) {
      navigate(currentStep.route);
      if (step === 0) {
        openModal('course-create');
      }
    } else if (currentStep.agentContext) {
      // Step 4: open agent with L1 context
      openAgentWithContext(currentStep.agentContext.type, currentStep.agentContext.data);
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
        <button className={styles.skipBtn} onClick={handleSkip} title={t('onboarding.skipStep')}>
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
        <h2 className={styles.title}>{t(currentStep.titleKey)}</h2>
        <p className={styles.description}>{t(currentStep.descriptionKey)}</p>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleAction}>
            {t(currentStep.actionKey)}
            <ChevronRight size={16} />
          </button>
          <button className={styles.textBtn} onClick={handleNext}>
            {isLast ? t('onboarding.finish') : t('onboarding.skipStep')}
          </button>
        </div>
      </div>
    </div>
  );
}
