import { useState, useCallback } from 'react';
import { FileText, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { PreferenceFormMessage, PreferenceQuestion } from '@/stores/agentStore';
import { useAgentStore } from '@/stores/agentStore';
import MonthCalendar from '@/components/MonthCalendar';
import styles from './PreferenceForm.module.css';

interface PreferenceFormProps {
  form: PreferenceFormMessage;
}

export default function PreferenceForm({ form }: PreferenceFormProps) {
  const submitPreferenceForm = useAgentStore((s) => s.submitPreferenceForm);
  const streaming = useAgentStore((s) => s.streaming);
  const [responses, setResponses] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const q of form.questions) {
      if (q.default_value !== undefined) {
        defaults[q.id] = q.default_value;
      } else if (q.type === 'multi_choice' || q.type === 'document_select') {
        defaults[q.id] = [];
      } else if (q.type === 'date_picker') {
        defaults[q.id] = [];
      } else if (q.type === 'number_input') {
        defaults[q.id] = '';
      } else {
        defaults[q.id] = '';
      }
    }
    return defaults;
  });
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const handleSingleChoice = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleMultiChoice = useCallback((questionId: string, value: string, maxSelect?: number) => {
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter((v) => v !== value) };
      }
      if (maxSelect && current.length >= maxSelect) {
        return prev; // At max
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  }, []);

  const handleNumberInput = useCallback((questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleDatePicker = useCallback((questionId: string, dates: string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: dates }));
  }, []);

  const handleDocSelect = useCallback((questionId: string, docId: string, maxSelect?: number) => {
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (current.includes(docId)) {
        return { ...prev, [questionId]: current.filter((v) => v !== docId) };
      }
      if (maxSelect && current.length >= maxSelect) {
        return prev;
      }
      return { ...prev, [questionId]: [...current, docId] };
    });
  }, []);

  const toggleDocExpand = useCallback((docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    submitPreferenceForm(form.id, responses);
  }, [form.id, responses, submitPreferenceForm]);

  // If already submitted, render read-only summary
  if (form.submitted) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <Check size={14} className={styles.checkIcon} />
          <span className={styles.headerText}>偏好已提交</span>
        </div>
        <div className={styles.submittedSummary}>
          {form.questions.map((q) => {
            const val = form.responses?.[q.id];
            let display = '';
            if (q.type === 'single_choice') {
              const opt = q.options?.find((o) => o.value === val);
              display = opt?.label || String(val || '—');
            } else if (q.type === 'multi_choice') {
              const vals = val as string[] | undefined;
              display = vals?.map((v) => q.options?.find((o) => o.value === v)?.label || v).join('、') || '—';
            } else if (q.type === 'date_picker') {
              const vals = val as string[] | undefined;
              if (vals && vals.length > 0) {
                display = vals.length === 1 ? vals[0] : `${vals[0]} 至 ${vals[vals.length - 1]}（${vals.length}天）`;
              } else {
                display = '—';
              }
            } else if (q.type === 'document_select') {
              const vals = val as string[] | undefined;
              display = vals?.map((v) => q.documents?.find((d) => d.id === v)?.filename || v).join('、') || '—';
            } else {
              display = String(val || '—');
            }
            return (
              <div key={q.id} className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{q.label}</span>
                <span className={styles.summaryValue}>{display}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <span className={styles.headerText}>请填写以下偏好</span>
      </div>

      <div className={styles.questions}>
        {form.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={responses[q.id]}
            onSingleChoice={handleSingleChoice}
            onMultiChoice={handleMultiChoice}
            onNumberInput={handleNumberInput}
            onDatePicker={handleDatePicker}
            onDocSelect={handleDocSelect}
            expandedDocs={expandedDocs}
            onToggleDocExpand={toggleDocExpand}
          />
        ))}
      </div>

      <button className={styles.submitBtn} onClick={handleSubmit} disabled={streaming}>
        提交
      </button>
    </div>
  );
}

interface QuestionRendererProps {
  question: PreferenceQuestion;
  value: unknown;
  onSingleChoice: (id: string, value: string) => void;
  onMultiChoice: (id: string, value: string, maxSelect?: number) => void;
  onNumberInput: (id: string, value: string) => void;
  onDatePicker: (id: string, dates: string[]) => void;
  onDocSelect: (id: string, docId: string, maxSelect?: number) => void;
  expandedDocs: Set<string>;
  onToggleDocExpand: (docId: string) => void;
}

function QuestionRenderer({
  question,
  value,
  onSingleChoice,
  onMultiChoice,
  onNumberInput,
  onDatePicker,
  onDocSelect,
  expandedDocs,
  onToggleDocExpand,
}: QuestionRendererProps) {
  const q = question;

  return (
    <div className={styles.question}>
      <div className={styles.questionLabel}>
        {q.label}
        {q.required === false && <span className={styles.optional}>(可选)</span>}
      </div>

      {q.type === 'single_choice' && q.options && (
        <div className={styles.optionGroup}>
          {q.options.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.optionBtn} ${value === opt.value ? styles.selected : ''}`}
              onClick={() => onSingleChoice(q.id, opt.value)}
            >
              <span className={styles.radioCircle}>
                {value === opt.value && <span className={styles.radioDot} />}
              </span>
              <div className={styles.optionContent}>
                <span className={styles.optionLabel}>{opt.label}</span>
                {opt.description && <span className={styles.optionDesc}>{opt.description}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {q.type === 'multi_choice' && q.options && (
        <div className={styles.optionGroup}>
          {q.options.map((opt) => {
            const selected = ((value as string[]) || []).includes(opt.value);
            return (
              <button
                key={opt.value}
                className={`${styles.optionBtn} ${selected ? styles.selected : ''}`}
                onClick={() => onMultiChoice(q.id, opt.value, q.max_select)}
              >
                <span className={styles.checkBox}>
                  {selected && <Check size={10} />}
                </span>
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {opt.description && <span className={styles.optionDesc}>{opt.description}</span>}
                </div>
              </button>
            );
          })}
          {q.max_select && (
            <div className={styles.maxHint}>最多选择 {q.max_select} 项</div>
          )}
        </div>
      )}

      {q.type === 'number_input' && (
        <input
          type="number"
          className={styles.numberInput}
          value={String(value || '')}
          onChange={(e) => onNumberInput(q.id, e.target.value)}
          placeholder={q.placeholder || '请输入数字'}
          min={1}
          max={20}
        />
      )}

      {q.type === 'date_picker' && (
        <div className={styles.datePickerWrap}>
          <MonthCalendar
            selectedDates={(value as string[]) || []}
            onDatesChange={(dates) => onDatePicker(q.id, dates)}
            minDate={q.date_config?.min_date}
            maxDate={q.date_config?.max_date}
          />
        </div>
      )}

      {q.type === 'document_select' && q.documents && (
        <div className={styles.docList}>
          {q.documents.map((doc) => {
            const selected = ((value as string[]) || []).includes(doc.id);
            const expanded = expandedDocs.has(doc.id);
            return (
              <div key={doc.id} className={`${styles.docItem} ${selected ? styles.docSelected : ''}`}>
                <div className={styles.docRow} onClick={() => onDocSelect(q.id, doc.id, q.max_select || 3)}>
                  <span className={styles.checkBox}>
                    {selected && <Check size={10} />}
                  </span>
                  <FileText size={14} className={styles.docIcon} />
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{doc.filename}</span>
                    <span className={styles.docMeta}>
                      {doc.page_count ? `${doc.page_count}页` : ''}
                      {doc.document_type ? ` · ${doc.document_type}` : ''}
                    </span>
                  </div>
                  <button
                    className={styles.docExpandBtn}
                    onClick={(e) => { e.stopPropagation(); onToggleDocExpand(doc.id); }}
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                </div>
                {expanded && doc.summary && (
                  <div className={styles.docSummary}>{doc.summary}</div>
                )}
              </div>
            );
          })}
          {q.max_select && (
            <div className={styles.maxHint}>
              最多选择 {q.max_select} 个文档
              {(() => {
                const sel = (value as string[]) || [];
                const totalPages = sel.reduce((sum, id) => {
                  const d = q.documents?.find((doc) => doc.id === id);
                  return sum + (d?.page_count || 0);
                }, 0);
                return totalPages > 0 ? ` · 已选 ${totalPages} 页` : '';
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
