import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardTemplateContent from './CardTemplateContent';

const formulaCard = (formula: string) => render(
  <CardTemplateContent templateType={'formula' as never} content={{ formula } as never} />,
).container.innerHTML;

describe('formula cards hold formulas from document imports', () => {
  it('renders \\(...\\) without a red KaTeX error', () => {
    const out = formulaCard('\\(\\frac{C}{i}\\)');
    expect(out).toContain('katex');
    expect(out).not.toContain('katex-error');
    expect(out).not.toContain('\\(');
  });

  it('renders $...$ as before', () => {
    expect(formulaCard('$\\frac{C}{i}$')).not.toContain('katex-error');
  });

  it('does not strip the outer delimiters of two formulas with text between', () => {
    expect(formulaCard('\\(a\\) and \\(b\\)')).toContain('and');
  });
});
