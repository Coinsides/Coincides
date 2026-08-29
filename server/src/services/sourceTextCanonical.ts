export type SourceTextNormalization = 'none' | 'punctuation' | 'whitespace';

const PUNCTUATION_REPLACEMENTS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  '，': ',',
  '。': '.',
  '：': ':',
  '；': ';',
  '！': '!',
  '？': '?',
};

export function canonicalizeSourceText(
  value: string,
  normalization: SourceTextNormalization,
): string {
  if (normalization === 'none') return value;
  if (normalization === 'whitespace') return value.replace(/\s+/gu, '');
  return value.replace(
    /[‘’“”–—…，。：；！？]/gu,
    (character) => PUNCTUATION_REPLACEMENTS[character],
  );
}

export function nonWhitespaceText(value: string): string {
  return value.replace(/\s/gu, '');
}
