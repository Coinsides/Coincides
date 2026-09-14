export function isArgumentObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Keep diagnostics bounded, including for short inputs: never repeat the entire
// argument string or JSON.parse's exception (which may quote the whole input).
export function toolArgumentError(
  name: string,
  raw: string,
  reason: string,
  finishReason: string | null = null,
): string {
  const prefixLength = Math.min(32, Math.max(0, raw.length - 1));
  return `Tool '${name || '(unnamed)'}' arguments ${reason}; `
    + `finish_reason=${finishReason ?? 'unknown'}; raw_length=${raw.length}; `
    + `raw_prefix=${JSON.stringify(raw.slice(0, prefixLength))}${raw.length ? '…' : ''}. `
    + 'The tool was not executed. Retry with a complete JSON object.';
}

export function parseToolArguments(
  name: string,
  raw: string,
  finishReason: string | null = null,
): { arguments: Record<string, unknown>; error?: never } | { arguments?: never; error: string } {
  if (finishReason === 'length') {
    return { error: toolArgumentError(name, raw, 'were truncated by the output token limit', finishReason) };
  }
  if (!raw.trim()) {
    return { error: toolArgumentError(name, raw, 'are empty (no JSON received)', finishReason) };
  }
  let value: unknown;
  try { value = JSON.parse(raw); } catch {
    return { error: toolArgumentError(name, raw, 'contain invalid JSON', finishReason) };
  }
  if (!isArgumentObject(value)) {
    return { error: toolArgumentError(name, raw, 'must be a JSON object', finishReason) };
  }
  return { arguments: value };
}
