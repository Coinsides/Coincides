import { useState, useEffect, FormEvent } from 'react';
import { Star } from 'lucide-react';
import { useCardStore } from '@/stores/cardStore';
import { useDeckStore } from '@/stores/deckStore';
import { useSectionStore } from '@/stores/sectionStore';
import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';
import { CardTemplateType } from '@shared/types';
import type { Card, DefinitionContent, TheoremContent, FormulaContent, GeneralContent } from '@shared/types';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import styles from './CardModal.module.css';

const templates = [
  { value: CardTemplateType.Definition, label: 'Definition' },
  { value: CardTemplateType.Theorem, label: 'Theorem' },
  { value: CardTemplateType.Formula, label: 'Formula' },
  { value: CardTemplateType.General, label: 'General' },
];

interface VariableEntry {
  key: string;
  value: string;
}

export default function CardModal() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);
  const { createCard, updateCard } = useCardStore();
  const decks = useDeckStore((s) => s.decks);
  const sections = useSectionStore((s) => s.sections);
  const tags = useTagStore((s) => s.tags);
  const tagGroups = useTagStore((s) => s.tagGroups);
  const fetchTagGroups = useTagStore((s) => s.fetchTagGroups);

  const isEdit = modal?.type === 'card-edit';
  const existing = modal?.data?.card as (Card & { tags?: { id: string }[] }) | undefined;
  const deckId = modal?.data?.deckId as string | undefined;

  // Determine course_id from the deck
  const effectiveDeckId = existing?.deck_id || deckId || '';
  const deck = decks.find((d) => d.id === effectiveDeckId);
  const courseId = deck?.course_id;

  const [templateType, setTemplateType] = useState<CardTemplateType>(CardTemplateType.General);
  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [importance, setImportance] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Content fields
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [statement, setStatement] = useState('');
  const [conditions, setConditions] = useState('');
  const [proofSketch, setProofSketch] = useState('');
  const [formula, setFormula] = useState('');
  const [variables, setVariables] = useState<VariableEntry[]>([]);
  const [applicableConditions, setApplicableConditions] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isEdit && existing) {
      setTemplateType(existing.template_type);
      setTitle(existing.title);
      setSectionId(existing.section_id || '');
      setImportance(existing.importance);
      setSelectedTags(existing.tags?.map((t) => t.id) || []);

      const content = existing.content;
      switch (existing.template_type) {
        case CardTemplateType.Definition: {
          const c = content as DefinitionContent;
          setDefinition(c.definition || '');
          setExample(c.example || '');
          setNotes(c.notes || '');
          break;
        }
        case CardTemplateType.Theorem: {
          const c = content as TheoremContent;
          setStatement(c.statement || '');
          setConditions(c.conditions || '');
          setProofSketch(c.proof_sketch || '');
          setNotes(c.notes || '');
          break;
        }
        case CardTemplateType.Formula: {
          const c = content as FormulaContent;
          setFormula(c.formula || '');
          setVariables(
            c.variables
              ? Object.entries(c.variables).map(([key, value]) => ({ key, value }))
              : []
          );
          setApplicableConditions(c.applicable_conditions || '');
          setNotes(c.notes || '');
          break;
        }
        case CardTemplateType.General: {
          const c = content as GeneralContent;
          setBody(c.body || '');
          setNotes(c.notes || '');
          break;
        }
      }
    }
  }, [modal]);

  // Fetch course-specific tag groups when courseId is determined
  useEffect(() => {
    if (courseId) {
      fetchTagGroups(courseId);
    }
  }, [courseId]);

  const hasTagGroups = tagGroups.length > 0;

  const buildContent = () => {
    switch (templateType) {
      case CardTemplateType.Definition:
        return {
          definition,
          ...(example && { example }),
          ...(notes && { notes }),
        };
      case CardTemplateType.Theorem:
        return {
          statement,
          ...(conditions && { conditions }),
          ...(proofSketch && { proof_sketch: proofSketch }),
          ...(notes && { notes }),
        };
      case CardTemplateType.Formula: {
        const vars: Record<string, string> = {};
        variables.forEach((v) => {
          if (v.key.trim()) vars[v.key.trim()] = v.value;
        });
        return {
          formula,
          ...(Object.keys(vars).length > 0 && { variables: vars }),
          ...(applicableConditions && { applicable_conditions: applicableConditions }),
          ...(notes && { notes }),
        };
      }
      case CardTemplateType.General:
        return {
          body,
          ...(notes && { notes }),
        };
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      const content = buildContent();
      if (isEdit && existing) {
        await updateCard(existing.id, {
          template_type: templateType,
          title: title.trim(),
          content,
          importance,
          section_id: sectionId || null,
          tag_ids: selectedTags,
        });
        addToast('success', 'Card updated');
      } else {
        await createCard({
          deck_id: existing?.deck_id || deckId || '',
          section_id: sectionId || undefined,
          template_type: templateType,
          title: title.trim(),
          content,
          importance,
          tag_ids: selectedTags,
        });
        addToast('success', 'Card created');
      }
      closeModal();
    } catch {
      addToast('error', isEdit ? 'Failed to update card' : 'Failed to create card');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const addVariable = () => setVariables([...variables, { key: '', value: '' }]);
  const removeVariable = (i: number) => setVariables(variables.filter((_, idx) => idx !== i));
  const updateVariable = (i: number, field: 'key' | 'value', val: string) => {
    setVariables(variables.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)));
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Edit Card' : 'New Card'}</div>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Template type selector */}
          <div className={styles.field}>
            <label>Template Type</label>
            <div className={styles.templateBtns}>
              {templates.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.templateBtn} ${templateType === t.value ? styles.activeTemplate : ''}`}
                  onClick={() => setTemplateType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              placeholder="Card title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Section */}
          {sections.length > 0 && (
            <div className={styles.field}>
              <label>Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic content fields */}
          {templateType === CardTemplateType.Definition && (
            <>
              <div className={styles.field}>
                <label>Definition</label>
                <textarea
                  placeholder="Enter the definition. Use $...$ for inline LaTeX."
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Example (optional)</label>
                <textarea
                  placeholder="An illustrative example. Use $...$ for LaTeX."
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                />
              </div>
            </>
          )}

          {templateType === CardTemplateType.Theorem && (
            <>
              <div className={styles.field}>
                <label>Statement</label>
                <textarea
                  placeholder="The theorem statement. Use $...$ for LaTeX."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Conditions (optional)</label>
                <textarea
                  placeholder="Required conditions for the theorem."
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Proof sketch (optional)</label>
                <textarea
                  placeholder="Outline of the proof. Use $...$ for LaTeX."
                  value={proofSketch}
                  onChange={(e) => setProofSketch(e.target.value)}
                />
              </div>
            </>
          )}

          {templateType === CardTemplateType.Formula && (
            <>
              <div className={styles.field}>
                <label>Formula (LaTeX)</label>
                <textarea
                  placeholder="e.g. E = mc^2 (no $ delimiters needed)"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  required
                />
                {formula && (
                  <div className={styles.preview}>
                    <div className={styles.previewLabel}>Preview:</div>
                    <KaTeXRenderer text={`$$${formula}$$`} />
                  </div>
                )}
              </div>
              <div className={styles.field}>
                <label>Variables</label>
                {variables.map((v, i) => (
                  <div key={i} className={styles.variableRow}>
                    <input
                      placeholder="Variable (e.g. E)"
                      value={v.key}
                      onChange={(e) => updateVariable(i, 'key', e.target.value)}
                    />
                    <span className={styles.eq}>=</span>
                    <input
                      placeholder="Description"
                      value={v.value}
                      onChange={(e) => updateVariable(i, 'value', e.target.value)}
                    />
                    <button type="button" className={styles.removeVarBtn} onClick={() => removeVariable(i)}>
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className={styles.addVarBtn} onClick={addVariable}>
                  + Add variable
                </button>
              </div>
              <div className={styles.field}>
                <label>Applicable conditions (optional)</label>
                <textarea
                  placeholder="When does this formula apply?"
                  value={applicableConditions}
                  onChange={(e) => setApplicableConditions(e.target.value)}
                />
              </div>
            </>
          )}

          {templateType === CardTemplateType.General && (
            <div className={styles.field}>
              <label>Body</label>
              <textarea
                placeholder="Card content. Use $...$ for inline LaTeX, $$...$$ for display."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
          )}

          {/* Notes (shared across all types) */}
          <div className={styles.field}>
            <label>Notes (optional)</label>
            <textarea
              placeholder="Additional notes. Use $...$ for LaTeX."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Importance */}
          <div className={styles.field}>
            <label>Importance</label>
            <div className={styles.starsInput}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.starBtn}
                  onClick={() => setImportance(n)}
                >
                  <Star
                    size={18}
                    fill={n <= importance ? '#f59e0b' : 'none'}
                    color={n <= importance ? '#f59e0b' : 'var(--text-muted)'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.field}>
            <label>Tags</label>
            {hasTagGroups ? (
              // Show course-specific tags grouped by tag group
              tagGroups.map((group) => (
                <div key={group.id} className={styles.tagGroupSection}>
                  <div className={styles.tagGroupName}>{group.name}</div>
                  <div className={styles.tagList}>
                    {group.tags?.map((tag) => (
                      <label key={tag.id} className={styles.tagCheck}>
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                        />
                        <span
                          className={styles.tagLabel}
                          style={tag.color ? { borderColor: tag.color + '60', color: tag.color } : undefined}
                        >
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Fallback: show all user tags
              <div className={styles.tagList}>
                {tags.map((tag) => (
                  <label key={tag.id} className={styles.tagCheck}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                    />
                    <span
                      className={styles.tagLabel}
                      style={tag.color ? { borderColor: tag.color + '60', color: tag.color } : undefined}
                    >
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Update Card' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
