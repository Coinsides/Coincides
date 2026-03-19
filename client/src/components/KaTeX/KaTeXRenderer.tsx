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
    // Handle inline: $...$
    let result = part.replace(/\$([^$\n]+?)\$/g, (_match, latex: string) => {
      return renderSegment(latex.trim(), false);
    });
    // Handle orphaned $ with LaTeX-like content after it (e.g. "$\mathbb{R}^n")
    // If a lone $ remains followed by backslash or common LaTeX chars, try to render it
    result = result.replace(/\$([\\^_{}a-zA-Z0-9 .+\-*/=()]+)$/g, (_match, latex: string) => {
      if (latex.includes('\\') || latex.includes('^') || latex.includes('_')) {
        return renderSegment(latex.trim(), false);
      }
      return _match;
    });
    return result;
  });
  return rendered.join('');
}

export default function KaTeXRenderer({ text, className }: KaTeXRendererProps) {
  const html = useMemo(() => {
    if (!text) return '';
    return parseAndRender(text);
  }, [text]);

  if (!text) return null;

  return (
    <span
      className={`${styles.katex} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
