import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import type {
  CardContent,
  DefinitionContent,
  TheoremContent,
  FormulaContent,
  GeneralContent,
} from '@shared/types';
import { CardTemplateType } from '@shared/types';
import styles from './CardFlip.module.css';

interface CardTemplateContentProps {
  templateType: CardTemplateType;
  content: CardContent;
}

function DefinitionView({ content }: { content: DefinitionContent }) {
  return (
    <div className={styles.templateContent}>
      <div className={styles.contentLabel}>Definition:</div>
      <div className={styles.contentBody}>
        <KaTeXRenderer text={content.definition} />
      </div>
      {content.example && (
        <>
          <div className={styles.contentLabel}>Example:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.example} />
          </div>
        </>
      )}
      {content.notes && (
        <>
          <div className={styles.contentLabel}>Notes:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.notes} />
          </div>
        </>
      )}
    </div>
  );
}

function TheoremView({ content }: { content: TheoremContent }) {
  return (
    <div className={styles.templateContent}>
      <div className={styles.contentLabel}>Statement:</div>
      <div className={styles.contentBody}>
        <KaTeXRenderer text={content.statement} />
      </div>
      {content.conditions && (
        <>
          <div className={styles.contentLabel}>Conditions:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.conditions} />
          </div>
        </>
      )}
      {content.proof_sketch && (
        <>
          <div className={styles.contentLabel}>Proof sketch:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.proof_sketch} />
          </div>
        </>
      )}
      {content.notes && (
        <>
          <div className={styles.contentLabel}>Notes:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.notes} />
          </div>
        </>
      )}
    </div>
  );
}

function FormulaView({ content }: { content: FormulaContent }) {
  return (
    <div className={styles.templateContent}>
      <div className={styles.formulaDisplay}>
        <KaTeXRenderer text={`$$${content.formula}$$`} />
      </div>
      {content.variables && Object.keys(content.variables).length > 0 && (
        <>
          <div className={styles.contentLabel}>Variables:</div>
          <div className={styles.variableTable}>
            {Object.entries(content.variables).map(([key, value]) => (
              <div key={key} className={styles.variableRow}>
                <span className={styles.variableKey}>
                  <KaTeXRenderer text={`$${key}$`} />
                </span>
                <span className={styles.variableSep}>=</span>
                <span className={styles.variableValue}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {content.applicable_conditions && (
        <>
          <div className={styles.contentLabel}>Applicable conditions:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.applicable_conditions} />
          </div>
        </>
      )}
      {content.notes && (
        <>
          <div className={styles.contentLabel}>Notes:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.notes} />
          </div>
        </>
      )}
    </div>
  );
}

function GeneralView({ content }: { content: GeneralContent }) {
  return (
    <div className={styles.templateContent}>
      <div className={styles.contentBody}>
        <KaTeXRenderer text={content.body} />
      </div>
      {content.notes && (
        <>
          <div className={styles.contentLabel}>Notes:</div>
          <div className={styles.contentBody}>
            <KaTeXRenderer text={content.notes} />
          </div>
        </>
      )}
    </div>
  );
}

export default function CardTemplateContent({ templateType, content }: CardTemplateContentProps) {
  switch (templateType) {
    case CardTemplateType.Definition:
      return <DefinitionView content={content as DefinitionContent} />;
    case CardTemplateType.Theorem:
      return <TheoremView content={content as TheoremContent} />;
    case CardTemplateType.Formula:
      return <FormulaView content={content as FormulaContent} />;
    case CardTemplateType.General:
      return <GeneralView content={content as GeneralContent} />;
    default:
      return <GeneralView content={content as GeneralContent} />;
  }
}
