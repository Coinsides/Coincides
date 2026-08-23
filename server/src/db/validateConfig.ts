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
    key: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key for AI chat and document OCR. Can also be set in user Settings.',
  },
  {
    key: 'VOYAGE_API_KEY',
    required: false,
    description: 'Voyage AI API key for semantic embedding. Without it, search degrades to FTS5 + LIKE.',
  },
];

const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'] as const;

export interface McpTransportConfig {
  allowedHostnames: string[];
  allowedOriginHostnames: string[];
}

export interface ServerConfig {
  mcp: McpTransportConfig;
}

function normalizeHostname(value: string, key: string): string {
  const hostname = value.trim().toLowerCase();
  if (!hostname) throw new Error(`${key} contains an empty hostname`);
  if (/\s|\*|:\/\/|[/@?#]/.test(hostname)) {
    throw new Error(`${key} must contain hostnames only (no scheme, wildcard, credentials, path, query, or fragment)`);
  }

  let parsed: URL;
  try {
    parsed = new URL(`http://${hostname}`);
  } catch {
    throw new Error(`${key} contains an invalid hostname: ${value}`);
  }
  if (
    parsed.hostname !== hostname
    || parsed.port !== ''
    || parsed.username !== ''
    || parsed.password !== ''
    || parsed.pathname !== '/'
    || parsed.search !== ''
    || parsed.hash !== ''
  ) {
    throw new Error(`${key} must contain hostname-only values without ports`);
  }
  return parsed.hostname;
}

function parseHostnameAllowlist(key: string, rawValue: string | undefined): string[] {
  if (rawValue === undefined) return [...LOCALHOST_HOSTNAMES];
  if (rawValue.trim() === '') throw new Error(`${key} must not be empty`);

  const values = rawValue.split(',').map((value) => normalizeHostname(value, key));
  const unique = [...new Set(values)];
  if (unique.length === 0) throw new Error(`${key} must contain at least one hostname`);
  return unique;
}

export function readMcpTransportConfig(
  env: NodeJS.ProcessEnv = process.env,
): McpTransportConfig {
  return {
    allowedHostnames: parseHostnameAllowlist(
      'MCP_ALLOWED_HOSTNAMES',
      env.MCP_ALLOWED_HOSTNAMES,
    ),
    allowedOriginHostnames: parseHostnameAllowlist(
      'MCP_ALLOWED_ORIGIN_HOSTNAMES',
      env.MCP_ALLOWED_ORIGIN_HOSTNAMES,
    ),
  };
}

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
export function validateConfig(): ServerConfig {
  const mcp = readMcpTransportConfig();
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
  return { mcp };
}
