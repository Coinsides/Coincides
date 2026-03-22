/**
 * Coincides — Startup Configuration Validator
 * 
 * Validates required and optional environment variables at server startup.
 * Exits with a clear error message if critical config is missing,
 * rather than failing with cryptic errors at runtime.
 */

interface ConfigRule {
  key: string;
  required: boolean;
  description: string;
}

const CONFIG_RULES: ConfigRule[] = [
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string. Example: postgresql://user:password@localhost:5432/coincides',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key for AI chat and document OCR. Can also be set in user Settings.',
  },
  {
    key: 'VOYAGE_API_KEY',
    required: false,
    description: 'Voyage AI API key for semantic embedding. Without it, search degrades to full-text search.',
  },
];

/**
 * Validate environment configuration at startup.
 * 
 * - Missing REQUIRED keys → print error and exit(1)
 * - Missing OPTIONAL keys → print warning and continue
 * 
 * Note: Both API keys are marked as optional because users can also
 * provide them through the Settings page in the app. The .env file
 * is a convenience, not a requirement.
 */
export function validateConfig(): void {
  console.log('🔧 Checking configuration...');

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of CONFIG_RULES) {
    const value = process.env[rule.key];
    
    if (!value || value.trim() === '') {
      if (rule.required) {
        errors.push(`  ❌ ${rule.key} — ${rule.description}`);
      } else {
        warnings.push(`  ⚠ ${rule.key} not set — ${rule.description}`);
      }
    }
  }

  // Print warnings (non-fatal)
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(w);
    }
  }

  // Print errors and exit if any required config is missing
  if (errors.length > 0) {
    console.error('\n🚫 Missing required configuration:\n');
    for (const e of errors) {
      console.error(e);
    }
    console.error('\nCreate a .env file in the project root or set these environment variables.');
    console.error('See docs/workflow/Coincides-Onboarding.md § 六 for setup instructions.\n');
    process.exit(1);
  }

  console.log('🔧 Configuration OK.\n');
}
