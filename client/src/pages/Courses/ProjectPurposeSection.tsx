import { useCallback, useEffect, useState } from 'react';
import { Archive, Compass, Lock, LockOpen, Pencil, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  amendPurposeCard,
  loadProjectPurposeCards,
  loadPurposeCard,
  loadPurposeTraces,
  redraftPurposeCard,
  type PurposeCard,
  type PurposeCardPatch,
  type PurposeTrace,
} from '../Notes/canvasEngine/purposeRepository';
import sectionStyles from './CourseDetail.module.css';
import styles from './ProjectPurposeSection.module.css';

const TRACE_LIMIT = 5;
const DRAFT_POLL_MS = 3000;
const DRAFT_POLL_LIMIT = 60;
const INTERPRETATION_FIELDS = ['true_goal', 'territory', 'behavior_pattern', 'time_window'] as const;
const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3600], ['minute', 60],
];

function relativeTime(ts: string, language: string): string {
  const seconds = (Date.parse(ts) - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, 'minute');
}

function isLockedRefusal(error: unknown): boolean {
  return (error as { response?: { data?: { details?: { code?: string } } } })
    .response?.data?.details?.code === 'purpose_interpretation_locked';
}

function PurposeTraces({ purposeId, version }: { purposeId: string; version: string }) {
  const { t, i18n } = useTranslation();
  const [traces, setTraces] = useState<PurposeTrace[] | null>(null);
  useEffect(() => {
    let current = true;
    void loadPurposeTraces(purposeId, TRACE_LIMIT)
      .then((events) => { if (current) setTraces(events); })
      .catch(() => { if (current) setTraces([]); });
    return () => { current = false; };
  }, [purposeId, version]);
  return <div className={styles.traces}>
    <div className={styles.label}>{t('purposeCards.tracesHeading')}</div>
    {traces && traces.length === 0 && <div className={styles.muted}>{t('purposeCards.noTraces')}</div>}
    {traces && traces.length > 0 && <ul data-purpose-traces="true">
      {traces.map((trace) => <li key={trace.seq}>
        <span className={styles.traceVerb}>{t(`purposeCards.verbs.${trace.verb}`, { defaultValue: trace.verb })}</span>
        {trace.actor_kind.startsWith('agent') && <span className={styles.badge}>{t('purposeCards.byAgent')}</span>}
        <span className={styles.traceSummary}>{trace.summary}</span>
        <time className={styles.muted} dateTime={trace.ts}>{relativeTime(trace.ts, i18n.language || 'en')}</time>
      </li>)}
    </ul>}
  </div>;
}

function PurposeCardView({ card, onChange, onRemove }: {
  card: PurposeCard;
  onChange: (next: PurposeCard) => void;
  onRemove: (purposeId: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<'words' | 'interpretation' | null>(null);
  const [words, setWords] = useState({ title: '', intent: '', user_verbatim: '' });
  const [reading, setReading] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftStatus = card.interpretation.draft_status;
  const pending = draftStatus === 'pending';

  useEffect(() => {
    if (!pending) return;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let current = true;
    const poll = () => {
      timer = setTimeout(() => {
        polls += 1;
        void loadPurposeCard(card.id).then((next) => {
          if (!current) return;
          onChange(next);
          if (next.interpretation.draft_status === 'pending' && polls < DRAFT_POLL_LIMIT) poll();
        }).catch(() => { if (current && polls < DRAFT_POLL_LIMIT) poll(); });
      }, DRAFT_POLL_MS);
    };
    poll();
    return () => { current = false; clearTimeout(timer); };
    // Polling belongs to this card's pending period, not to each render's callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, pending]);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(t(isLockedRefusal(failure) ? 'purposeCards.lockedRefused' : 'purposeCards.actionFailed'));
    } finally {
      setBusy(false);
    }
  }, [t]);
  const amend = (patch: PurposeCardPatch, after?: () => void) => run(async () => {
    onChange(await amendPurposeCard(card.id, patch));
    after?.();
  });

  const startWords = () => {
    setWords({ title: card.title, intent: card.intent ?? '', user_verbatim: card.user_verbatim ?? '' });
    setEditing('words');
  };
  const saveWords = () => {
    const patch: PurposeCardPatch = {};
    if (words.title.trim() && words.title !== card.title) patch.title = words.title;
    if (words.intent !== (card.intent ?? '')) patch.intent = words.intent || null;
    if (words.user_verbatim !== (card.user_verbatim ?? '')) patch.user_verbatim = words.user_verbatim || null;
    if (!Object.keys(patch).length) { setEditing(null); return; }
    void amend(patch, () => setEditing(null));
  };
  const startReading = () => {
    setReading(Object.fromEntries(INTERPRETATION_FIELDS.map((field) => [field, card.interpretation[field] ?? ''])));
    setEditing('interpretation');
  };
  const saveReading = () => {
    // Saving locks even if no word changed: the person has vouched for this text.
    const interpretation: NonNullable<PurposeCardPatch['interpretation']> = {};
    for (const field of INTERPRETATION_FIELDS) {
      if (reading[field] !== (card.interpretation[field] ?? '')) interpretation[field] = reading[field] || null;
    }
    void amend({ interpretation }, () => setEditing(null));
  };
  const filled = INTERPRETATION_FIELDS.filter((field) => card.interpretation[field]);
  const LockIcon = card.interpretation_locked ? Lock : LockOpen;

  return <article className={styles.card} data-purpose-card={card.id}>
    <header className={styles.cardHeader}>
      {editing === 'words' ? <span className={styles.cardTitle}>{t('purposeCards.edit')}</span>
        : <h3 className={styles.cardTitle}>{card.title}</h3>}
      <div className={styles.actions}>
        <button type="button" className={styles.iconButton} disabled={busy} data-purpose-lock="true"
          aria-pressed={card.interpretation_locked}
          aria-label={t(card.interpretation_locked ? 'purposeCards.unlock' : 'purposeCards.lock')}
          title={t(card.interpretation_locked ? 'purposeCards.unlock' : 'purposeCards.lock')}
          onClick={() => void amend({ interpretation_locked: !card.interpretation_locked })}>
          <LockIcon size={15} aria-hidden="true" />
        </button>
        <button type="button" className={styles.iconButton} disabled={busy} data-purpose-edit="true"
          aria-label={t('purposeCards.edit')} title={t('purposeCards.edit')} onClick={startWords}>
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button type="button" className={styles.iconButton} disabled={busy} data-purpose-archive="true"
          aria-label={t('purposeCards.archive')} title={t('purposeCards.archive')}
          onClick={() => void run(async () => {
            await amendPurposeCard(card.id, { status: 'archived' });
            onRemove(card.id);
          })}>
          <Archive size={15} aria-hidden="true" />
        </button>
      </div>
    </header>

    {editing === 'words' ? <div className={styles.form}>
      <label>{t('purposeCards.titleLabel')}
        <input value={words.title} maxLength={300} onChange={(event) => setWords({ ...words, title: event.target.value })} />
      </label>
      <label>{t('purposeCards.wordsLabel')}
        <textarea rows={2} value={words.user_verbatim} onChange={(event) => setWords({ ...words, user_verbatim: event.target.value })} />
      </label>
      <label>{t('purposeCards.intentLabel')}
        <textarea rows={2} value={words.intent} onChange={(event) => setWords({ ...words, intent: event.target.value })} />
      </label>
      <div className={styles.formActions}>
        <button type="button" disabled={busy} data-purpose-save="true" onClick={saveWords}>{t('purposeCards.save')}</button>
        <button type="button" disabled={busy} onClick={() => setEditing(null)}>{t('purposeCards.cancel')}</button>
      </div>
    </div> : <>
      {card.user_verbatim
        ? <blockquote className={styles.words} data-purpose-words="true">“{card.user_verbatim}”</blockquote>
        : card.created_by === 'importer'
          ? <span className={styles.badge} data-purpose-inferred="true">{t('purposeCards.inferred')}</span>
          : <div className={styles.muted}>{t('purposeCards.noWords')}</div>}
      {card.intent && <p className={styles.intent}>{card.intent}</p>}
    </>}

    <section className={styles.interpretation} aria-label={t('purposeCards.interpretationHeading')}>
      <div className={styles.labelRow}>
        <div className={styles.label}>{t('purposeCards.interpretationHeading')}</div>
        {card.interpretation_locked && <span className={styles.badge} data-purpose-locked="true">{t('purposeCards.locked')}</span>}
        {editing !== 'interpretation' && <button type="button" className={styles.textButton} disabled={busy}
          data-purpose-edit-interpretation="true" onClick={startReading}>{t('purposeCards.editInterpretation')}</button>}
      </div>
      {editing === 'interpretation' ? <div className={styles.form}>
        {INTERPRETATION_FIELDS.map((field) => <label key={field}>{t(`purposeCards.fields.${field}`)}
          <textarea rows={2} data-purpose-field={field} value={reading[field] ?? ''}
            onChange={(event) => setReading({ ...reading, [field]: event.target.value })} />
        </label>)}
        <div className={styles.formActions}>
          <button type="button" disabled={busy} data-purpose-save-lock="true" onClick={saveReading}>{t('purposeCards.saveAndLock')}</button>
          <button type="button" disabled={busy} onClick={() => setEditing(null)}>{t('purposeCards.cancel')}</button>
        </div>
      </div> : <>
        {filled.length > 0 && <dl className={styles.fields}>
          {filled.map((field) => <div key={field}>
            <dt>{t(`purposeCards.fields.${field}`)}</dt>
            <dd>{card.interpretation[field]}</dd>
          </div>)}
        </dl>}
        {filled.length === 0 && !pending && draftStatus !== 'failed'
          && <div className={styles.muted}>{t('purposeCards.noInterpretation')}</div>}
        {(pending || draftStatus === 'failed') && <div className={styles.draftState} data-purpose-draft={draftStatus}>
          <span role={draftStatus === 'failed' ? 'alert' : 'status'}>
            {t(pending ? 'purposeCards.drafting' : 'purposeCards.draftFailed')}
          </span>
          <button type="button" className={styles.textButton} disabled={busy} data-purpose-redraft="true"
            onClick={() => void run(async () => { onChange(await redraftPurposeCard(card.id)); })}>
            <RefreshCw size={13} aria-hidden="true" /> {t('purposeCards.redraft')}
          </button>
        </div>}
      </>}
    </section>

    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.muted} data-purpose-members="true">{t('purposeCards.members', { count: card.member_count })}</div>
    <PurposeTraces purposeId={card.id} version={card.updated_at} />
  </article>;
}

/** Shows what is on record. It never judges progress or tells the reader what they know. */
export function ProjectPurposeSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [cards, setCards] = useState<PurposeCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    return loadProjectPurposeCards(projectId).then(setCards).catch(() => setFailed(true));
  }, [projectId]);
  useEffect(() => {
    setCards(null);
    void load();
  }, [load]);

  return <div className={sectionStyles.section} data-project-purposes="true">
    <div className={sectionStyles.sectionHeader}>
      <div className={sectionStyles.sectionTitle}>
        <Compass size={18} />
        <span>{t('purposeCards.title')}</span>
        <span className={sectionStyles.sectionCount}>{cards?.length ?? 0}</span>
      </div>
    </div>
    {failed && <div className={styles.error} role="alert">
      {t('purposeCards.loadFailed')}
      <button type="button" className={styles.textButton} onClick={() => void load()}>{t('purposeCards.retry')}</button>
    </div>}
    {!failed && cards?.length === 0 && <div className={sectionStyles.empty}>{t('purposeCards.empty')}</div>}
    {cards && cards.length > 0 && <div className={styles.grid}>
      {cards.map((card) => <PurposeCardView key={card.id} card={card}
        onChange={(next) => setCards((current) => current?.map((entry) => entry.id === next.id ? next : entry) ?? null)}
        onRemove={(purposeId) => setCards((current) => current?.filter((entry) => entry.id !== purposeId) ?? null)} />)}
    </div>}
  </div>;
}
