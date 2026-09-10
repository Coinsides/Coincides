import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROVIDER_NAMES = ['anthropic', 'openai', 'generic', 'deepseek', 'dashscope', 'voyage'] as const;
export type CredentialProvider = typeof PROVIDER_NAMES[number];

const ENVIRONMENT_VARIABLES: Record<CredentialProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  generic: 'GENERIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  dashscope: 'DASHSCOPE_API_KEY',
  voyage: 'VOYAGE_API_KEY',
};

export interface ProviderCredentialStatus {
  provider: CredentialProvider;
  has_key: boolean;
  masked_key: string | null;
  source: 'local' | 'environment' | 'none';
  has_local_key: boolean;
}

export class ProviderCredentialError extends Error {
  constructor(readonly code: 'invalid_request' | 'store_unavailable') {
    super(code === 'invalid_request'
      ? 'Invalid provider credential request.'
      : 'Provider credential storage is unavailable. Check the application data directory.');
    this.name = 'ProviderCredentialError';
  }
}

type StoredCredentials = Partial<Record<CredentialProvider, string>>;
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function isInsideRepository(directory: string): boolean {
  const pathFromRoot = relative(repositoryRoot, directory);
  return pathFromRoot === ''
    || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot));
}

export function isCredentialProvider(provider: string): provider is CredentialProvider {
  return PROVIDER_NAMES.some((name) => name === provider);
}

function requireProvider(provider: string): CredentialProvider {
  if (!isCredentialProvider(provider)) throw new ProviderCredentialError('invalid_request');
  return provider;
}

/** Machine-local plaintext, equivalent to .env storage; never part of the user database. */
export function getProviderCredentialsFilePath(): string {
  let directory = process.env.COINCIDES_APP_DATA_DIR?.trim();
  const configuredDbPath = process.env.DB_PATH?.trim();
  if (!directory && configuredDbPath && configuredDbPath !== ':memory:') {
    const dbDirectory = dirname(resolve(configuredDbPath));
    if (!isInsideRepository(dbDirectory)) directory = dbDirectory;
  }
  if (!directory) {
    if (process.platform === 'win32') {
      directory = join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Coincides');
    } else if (process.platform === 'darwin') {
      directory = join(homedir(), 'Library', 'Application Support', 'Coincides');
    } else {
      directory = join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'Coincides');
    }
  }
  const resolvedDirectory = resolve(directory);
  if (isInsideRepository(resolvedDirectory)) throw new ProviderCredentialError('store_unavailable');
  return join(resolvedDirectory, 'provider-credentials.json');
}

function readCredentials(): StoredCredentials {
  const filePath = getProviderCredentialsFilePath();
  let contents: string;
  try {
    contents = readFileSync(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new ProviderCredentialError('store_unavailable');
  }
  try {
    const document = JSON.parse(contents) as { version?: unknown; providers?: unknown };
    if (document?.version !== 1 || !document.providers || typeof document.providers !== 'object'
      || Array.isArray(document.providers)) throw new Error();
    const entries = document.providers as Record<string, unknown>;
    const credentials: StoredCredentials = {};
    for (const provider of PROVIDER_NAMES) {
      const value = entries[provider];
      if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new Error();
      if (typeof value === 'string') credentials[provider] = value;
    }
    return credentials;
  } catch {
    // JSON errors can contain file contents; expose only the fixed storage message.
    throw new ProviderCredentialError('store_unavailable');
  }
}

function writeCredentials(credentials: StoredCredentials): void {
  const filePath = getProviderCredentialsFilePath();
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(temporaryPath, JSON.stringify({ version: 1, providers: credentials }, null, 2), 'utf8');
    renameSync(temporaryPath, filePath);
  } catch {
    try { unlinkSync(temporaryPath); } catch { /* No temporary file to remove. */ }
    throw new ProviderCredentialError('store_unavailable');
  }
}

function effectiveCredential(provider: CredentialProvider, credentials: StoredCredentials): string | undefined {
  return credentials[provider] || process.env[ENVIRONMENT_VARIABLES[provider]]?.trim() || undefined;
}

function statusFor(provider: CredentialProvider, credentials: StoredCredentials): ProviderCredentialStatus {
  const key = effectiveCredential(provider, credentials);
  const hasLocalKey = Boolean(credentials[provider]);
  return {
    provider,
    has_key: Boolean(key),
    masked_key: key ? `••••${key.length > 4 ? key.slice(-4) : ''}` : null,
    source: hasLocalKey ? 'local' : key ? 'environment' : 'none',
    has_local_key: hasLocalKey,
  };
}

export function resolveProviderCredential(provider: string): string | undefined {
  return effectiveCredential(requireProvider(provider), readCredentials());
}

export function listProviderCredentialStatuses(): ProviderCredentialStatus[] {
  const credentials = readCredentials();
  return PROVIDER_NAMES.map((provider) => statusFor(provider, credentials));
}

export function getProviderCredentialStatus(provider: string): ProviderCredentialStatus {
  return statusFor(requireProvider(provider), readCredentials());
}

export function saveProviderCredential(provider: string, apiKey: string): ProviderCredentialStatus {
  const name = requireProvider(provider);
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new ProviderCredentialError('invalid_request');
  const credentials = readCredentials();
  credentials[name] = apiKey.trim();
  writeCredentials(credentials);
  return statusFor(name, credentials);
}

export function clearProviderCredential(provider: string): ProviderCredentialStatus {
  const name = requireProvider(provider);
  const credentials = readCredentials();
  if (credentials[name]) {
    delete credentials[name];
    writeCredentials(credentials);
  }
  return statusFor(name, credentials);
}

export type ProviderConnectionCategory =
  | 'ok' | 'missing_key' | 'authentication' | 'rate_limit' | 'network' | 'timeout'
  | 'provider_error' | 'invalid_request';

export interface ProviderConnectionResult {
  success: boolean;
  category: ProviderConnectionCategory;
  http_status?: number;
}

export interface ProviderConnectionOptions {
  model?: string;
  base_url?: string;
}

const CONNECTION_DEFAULTS: Record<CredentialProvider, { model: string; baseUrl: string }> = {
  anthropic: { model: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com' },
  openai: { model: 'gpt-4o', baseUrl: 'https://api.openai.com' },
  generic: { model: 'gpt-4o', baseUrl: 'https://api.openai.com' },
  deepseek: { model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  dashscope: { model: 'qwen-plus', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode' },
  voyage: { model: 'voyage-4', baseUrl: 'https://api.voyageai.com' },
};

export async function testProviderConnection(
  provider: string,
  options: ProviderConnectionOptions = {},
): Promise<ProviderConnectionResult> {
  const name = requireProvider(provider);
  const apiKey = resolveProviderCredential(name);
  if (!apiKey) return { success: false, category: 'missing_key' };

  const defaults = CONNECTION_DEFAULTS[name];
  const model = options.model?.trim() || defaults.model;
  // Anthropic and Voyage currently use fixed endpoints in their runtime adapters.
  let baseUrl = (name === 'anthropic' || name === 'voyage'
    ? defaults.baseUrl : options.base_url?.trim() || defaults.baseUrl).replace(/\/$/, '');
  if (name === 'deepseek' || name === 'dashscope') baseUrl = baseUrl.replace(/\/v1\/?$/, '');
  let url: URL;
  try {
    url = new URL(`${baseUrl}/v1/${name === 'anthropic' ? 'messages' : name === 'voyage' ? 'embeddings' : 'chat/completions'}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
  } catch {
    return { success: false, category: 'invalid_request' };
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (name === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const body = name === 'voyage'
    ? { model, input: ['Connection check'], input_type: 'query' }
    : { model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1, stream: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
    });
    // Connection checking needs only the status; provider payloads are not forwarded.
    await response.body?.cancel();
    const status = response.status;
    const category: ProviderConnectionCategory = response.ok ? 'ok'
      : status === 401 || status === 403 ? 'authentication'
        : status === 429 ? 'rate_limit'
          : status === 408 || status === 504 ? 'timeout'
            : status >= 400 && status < 500 ? 'invalid_request' : 'provider_error';
    return { success: response.ok, category, http_status: status };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    return {
      success: false,
      category: controller.signal.aborted || name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timeout);
  }
}
