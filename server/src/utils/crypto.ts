/**
 * AES-256-GCM encryption for sensitive data (API keys).
 * 
 * Requires ENCRYPTION_KEY environment variable (32-byte hex string = 64 hex chars).
 * If not set, encryption/decryption are no-ops (passthrough) for dev convenience.
 * 
 * Format: base64(iv:authTag:ciphertext)
 * - iv: 12 bytes (96 bits) — GCM standard
 * - authTag: 16 bytes (128 bits) — integrity check
 * - ciphertext: variable length
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:';  // Prefix to identify encrypted values

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) return null;
  
  if (keyHex.length !== 64) {
    console.warn('⚠ ENCRYPTION_KEY must be 64 hex chars (32 bytes). Encryption disabled.');
    return null;
  }
  
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * Returns prefixed encrypted string, or original if no key configured.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;
  
  const key = getEncryptionKey();
  if (!key) return plaintext;  // No key = passthrough (dev mode)
  
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine: iv + authTag + ciphertext → base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + combined.toString('base64');
}

/**
 * Decrypt an encrypted string.
 * Returns plaintext, or original string if not encrypted / no key.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  // If not encrypted (no prefix), return as-is
  if (!encryptedText.startsWith(PREFIX)) return encryptedText;
  
  const key = getEncryptionKey();
  if (!key) {
    console.warn('⚠ Found encrypted value but ENCRYPTION_KEY not set. Cannot decrypt.');
    return '';  // Can't decrypt without key
  }
  
  try {
    const combined = Buffer.from(encryptedText.slice(PREFIX.length), 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption failed:', err);
    return '';  // Return empty on failure rather than crash
  }
}

/**
 * Check if a value is already encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(PREFIX) || false;
}

/**
 * Mask an API key for display (show first 4 and last 4 chars).
 * e.g., "sk-ant-api03-abc...xyz"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 12) return '****';
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

/**
 * Encrypt all api_key fields inside a settings object (deep).
 * Mutates and returns the object.
 */
export function encryptApiKeysInSettings(settings: Record<string, any>): Record<string, any> {
  // Encrypt ai_providers.*.api_key
  if (settings.ai_providers && typeof settings.ai_providers === 'object') {
    for (const provider of Object.values(settings.ai_providers) as Record<string, any>[]) {
      if (provider?.api_key && !isEncrypted(provider.api_key)) {
        provider.api_key = encrypt(provider.api_key);
      }
    }
  }
  
  // Encrypt embedding_api_key
  if (settings.embedding_api_key && !isEncrypted(settings.embedding_api_key)) {
    settings.embedding_api_key = encrypt(settings.embedding_api_key);
  }
  
  return settings;
}

/**
 * Decrypt all api_key fields inside a settings object (deep).
 * Returns a NEW object (does not mutate).
 */
export function decryptApiKeysInSettings(settings: Record<string, any>): Record<string, any> {
  const result = { ...settings };
  
  if (result.ai_providers && typeof result.ai_providers === 'object') {
    result.ai_providers = { ...result.ai_providers };
    for (const [name, provider] of Object.entries(result.ai_providers) as [string, Record<string, any>][]) {
      if (provider?.api_key) {
        result.ai_providers[name] = { ...provider, api_key: decrypt(provider.api_key) };
      }
    }
  }
  
  if (result.embedding_api_key) {
    result.embedding_api_key = decrypt(result.embedding_api_key);
  }
  
  return result;
}

/**
 * Mask all api_key fields for frontend display.
 * Returns a NEW object.
 */
export function maskApiKeysInSettings(settings: Record<string, any>): Record<string, any> {
  const result = { ...settings };
  
  if (result.ai_providers && typeof result.ai_providers === 'object') {
    result.ai_providers = { ...result.ai_providers };
    for (const [name, provider] of Object.entries(result.ai_providers) as [string, Record<string, any>][]) {
      if (provider?.api_key) {
        // Decrypt first (in case stored encrypted), then mask
        const decrypted = decrypt(provider.api_key);
        result.ai_providers[name] = { ...provider, api_key: maskApiKey(decrypted) };
      }
    }
  }
  
  if (result.embedding_api_key) {
    const decrypted = decrypt(result.embedding_api_key);
    result.embedding_api_key = maskApiKey(decrypted);
  }
  
  return result;
}
