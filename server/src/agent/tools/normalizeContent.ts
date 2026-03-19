/**
 * Normalize card content to match the expected template structure.
 * Prevents crashes when the Agent provides mismatched content fields.
 *
 * Expected structures:
 *   definition → { definition, example?, notes? }
 *   theorem    → { statement, conditions?, proof_sketch?, notes? }
 *   formula    → { formula, variables?, applicable_conditions?, notes? }
 *   general    → { body, notes? }
 */
export function normalizeCardContent(
  templateType: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  // Helper: extract a string from content, trying multiple field names
  const getString = (...keys: string[]): string => {
    for (const k of keys) {
      if (typeof content[k] === 'string' && (content[k] as string).length > 0) {
        return content[k] as string;
      }
    }
    return '';
  };

  switch (templateType) {
    case 'definition': {
      const definition = getString('definition', 'body', 'statement', 'formula');
      return {
        definition: definition || 'No definition provided',
        ...(content.example !== undefined && { example: content.example }),
        ...(content.notes !== undefined && { notes: content.notes }),
      };
    }
    case 'theorem': {
      const statement = getString('statement', 'body', 'definition');
      return {
        statement: statement || 'No statement provided',
        ...(content.conditions !== undefined && { conditions: content.conditions }),
        ...(content.proof_sketch !== undefined && { proof_sketch: content.proof_sketch }),
        ...(content.notes !== undefined && { notes: content.notes }),
      };
    }
    case 'formula': {
      const formula = getString('formula', 'body', 'definition', 'statement');
      return {
        formula: formula || 'No formula provided',
        ...(content.variables !== undefined && { variables: content.variables }),
        ...(content.applicable_conditions !== undefined && { applicable_conditions: content.applicable_conditions }),
        ...(content.notes !== undefined && { notes: content.notes }),
      };
    }
    case 'general':
    default: {
      const body = getString('body', 'definition', 'statement', 'formula');
      return {
        body: body || 'No content provided',
        ...(content.notes !== undefined && { notes: content.notes }),
      };
    }
  }
}
