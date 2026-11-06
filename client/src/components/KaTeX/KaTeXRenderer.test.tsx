import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KaTeXRenderer from './KaTeXRenderer';

const html = (text: string) => render(<KaTeXRenderer text={text} />).container.innerHTML;

describe('KaTeXRenderer delimiters', () => {
  it('renders the \\(...\\) a document import writes, with no raw backslash left', () => {
    const out = html('PV = \\(\\frac{C}{i}\\) = 面值');
    expect(out).toContain('katex');
    expect(out).toContain('面值');
    expect(out).not.toContain('\\(');
    expect(out).not.toContain('katex-error');
  });

  it('renders \\[...\\] in display mode', () => {
    expect(html('\\[x^2\\]')).toContain('katex-display');
  });

  it('a dollar in prose stays beside a \\(...\\) formula', () => {
    const out = html('美元 $100 和式子 \\(x\\)');
    expect(out).toContain('$100');
    expect(out).toContain('katex');
  });

  it('an escaped dollar inside \\(...\\) does not start a $...$ formula', () => {
    const out = html('\\(\\$5 + x\\) 和 $y$');
    expect(out).not.toContain('katex-error');
    expect(out.match(/class="katex"/g)).toHaveLength(2);
  });

  it('still renders $...$ and $$...$$', () => {
    expect(html('$x$')).toContain('katex');
    expect(html('$$x$$')).toContain('katex-display');
  });
});
