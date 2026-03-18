import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './KaTeXRenderer.module.css';

interface KaTeXRendererProps {
  text: string;
  className?: string;
}

function renderSegment(segment: string, isDisplay: boolean): string {
  try {
    return katex.renderToString(segment, {
      displayMode: isDisplay,
      throwOnError: false,
      trust: true,
    });
  } catch (err) {
    console.warn('KaTeX rendering failed:', err);
    return segment;
  }
}

function parseAndRender(text: string): string {
  // First handle display mode: $$...$$
  const parts = text.split(/(\$\$[\s\S]*?\$\$)/g);
  const rendered = parts.map((part) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const latex = part.slice(2, -2).trim();
      return renderSegment(latex, true);
    }
    // Then handle inline: $...$
    return part.replace(/\$([^$\n]+?)\$/g, (_match, latex: string) => {
      return renderSegment(latex.trim(), false);
    });
  });
  return rendered.join('');
}

export default function KaTeXRenderer({ text, className }: KaTeXRendererProps) {
  const html = useMemo(() => parseAndRender(text), [text]);

  return (
    <span
      className={`${styles.katex} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
