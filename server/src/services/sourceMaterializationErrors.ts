export type SourceArtifactErrorCode =
  | 'unsupported_format'
  | 'invalid_or_corrupt'
  | 'resource_limit'
  | 'parser_failure'
  | 'internal_interrupted';

const RETRYABLE_CODES = new Set<SourceArtifactErrorCode>([
  'parser_failure',
  'internal_interrupted',
]);

export function isSourceArtifactErrorRetryable(code: string | null | undefined): boolean {
  return Boolean(code && RETRYABLE_CODES.has(code as SourceArtifactErrorCode));
}
