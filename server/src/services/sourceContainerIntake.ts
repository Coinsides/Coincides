import { createWriteStream, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform, type TransformCallback } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';

interface YauzlEntry {
  fileNameRaw: Buffer;
  crc32: number;
  uncompressedSize: number;
}

interface YauzlZipFile {
  eachEntry(): AsyncIterable<YauzlEntry>;
  openReadStreamPromise(entry: YauzlEntry): Promise<NodeJS.ReadableStream>;
  close(): void;
}

interface YauzlModule {
  openPromise(path: string, options: {
    lazyEntries: true;
    decodeStrings: false;
    validateEntrySizes: true;
    autoClose: true;
  }): Promise<YauzlZipFile>;
}

const require = createRequire(import.meta.url);
const yauzl = require('yauzl') as YauzlModule;

const CP437_BYTES = [
  '\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼',
  '►◄↕‼¶§▬↨↑↓→←∟↔▲▼',
  ' !"#$%&\'()*+,-./',
  '0123456789:;<=>?',
  '@ABCDEFGHIJKLMNO',
  'PQRSTUVWXYZ[\\]^_',
  '`abcdefghijklmno',
  'pqrstuvwxyz{|}~⌂',
  'ÇüéâäàåçêëèïîìÄÅ',
  'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ',
  'áíóúñÑªº¿⌐¬½¼¡«»',
  '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐',
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧',
  '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀',
  'αßΓπΣσµτΦΘΩδ∞φε∩',
  '≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ',
].join('');

if (CP437_BYTES.length !== 256) {
  throw new Error('The ZIP CP437 fallback table must contain exactly 256 characters');
}

const CRC32_TABLE = new Uint32Array(256);
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  CRC32_TABLE[index] = value >>> 0;
}

class EntryIntegrityTransform extends Transform {
  private crc = 0xffffffff;
  private byteCount = 0;

  constructor(private readonly maximumBytes: number) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.byteCount += bytes.length;
    if (this.byteCount > this.maximumBytes) {
      callback(new Error('ZIP entry exceeds the Source upload byte limit'));
      return;
    }
    for (const byte of bytes) {
      this.crc = CRC32_TABLE[(this.crc ^ byte) & 0xff] ^ (this.crc >>> 8);
    }
    callback(null, bytes);
  }

  digest(): { crc32: number; byteCount: number } {
    return {
      crc32: (this.crc ^ 0xffffffff) >>> 0,
      byteCount: this.byteCount,
    };
  }
}

export interface SourceContainerEntryInput {
  path: string;
  original_filename: string;
  filename_decoding_fallback: boolean;
}

export interface SourceContainerStoredEntry {
  source_record_id: string;
  source_file_id: string;
  content_hash: string;
}

export interface SourceContainerEntryResult {
  entry_index: number;
  original_filename: string | null;
  filename_decoding_fallback: boolean;
  status: 'succeeded' | 'failed';
  content_hash: string | null;
  source_record_id: string | null;
  source_file_id: string | null;
}

export interface SourceContainerExpansionReport {
  kind: 'zip';
  opened: boolean;
  incomplete: boolean;
  entry_count: number;
  entries: SourceContainerEntryResult[];
}

export interface ExpandZipSourceContainerInput {
  zipPath: string;
  tempDirectory: string;
  maximumEntryBytes: number;
  intakeEntry: (entry: SourceContainerEntryInput) => Promise<SourceContainerStoredEntry>;
}

function decodeCp437(bytes: Buffer): string {
  let value = '';
  for (const byte of bytes) {
    value += CP437_BYTES[byte];
  }
  return value;
}

function decodeEntryName(bytes: Buffer): { filename: string; fallback: boolean } {
  try {
    return {
      filename: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      fallback: false,
    };
  } catch {
    return { filename: decodeCp437(bytes), fallback: true };
  }
}

function isDirectoryEntry(filename: string): boolean {
  return filename.endsWith('/') || filename.endsWith('\\');
}

function isSafeEntryPath(filename: string): boolean {
  if (!filename || filename.includes('\0')) return false;
  const slashPath = filename.split('\\').join('/');
  if (slashPath.startsWith('/') || slashPath.startsWith('//') || /^[A-Za-z]:/.test(slashPath)) {
    return false;
  }
  return !slashPath.split('/').some((segment) => segment === '..');
}

function failedEntry(
  entryIndex: number,
  originalFilename: string | null,
  filenameDecodingFallback: boolean,
): SourceContainerEntryResult {
  return {
    entry_index: entryIndex,
    original_filename: originalFilename,
    filename_decoding_fallback: filenameDecodingFallback,
    status: 'failed',
    content_hash: null,
    source_record_id: null,
    source_file_id: null,
  };
}

async function extractEntry(
  zipFile: YauzlZipFile,
  entry: YauzlEntry,
  tempPath: string,
  maximumEntryBytes: number,
): Promise<void> {
  if (entry.uncompressedSize > maximumEntryBytes) {
    throw new Error('ZIP entry exceeds the Source upload byte limit');
  }
  const integrity = new EntryIntegrityTransform(maximumEntryBytes);
  const stream = await zipFile.openReadStreamPromise(entry);
  await pipeline(stream, integrity, createWriteStream(tempPath, { flags: 'wx' }));
  const measured = integrity.digest();
  if (measured.byteCount !== entry.uncompressedSize) {
    throw new Error('ZIP entry uncompressed size did not match its central-directory declaration');
  }
  if (measured.crc32 !== (entry.crc32 >>> 0)) {
    throw new Error('ZIP entry CRC-32 did not match its central-directory declaration');
  }
}

export async function expandZipSourceContainer(
  input: ExpandZipSourceContainerInput,
): Promise<SourceContainerExpansionReport> {
  const entries: SourceContainerEntryResult[] = [];
  let opened = false;
  let incomplete = false;
  let entryCount = 0;
  let zipFile: YauzlZipFile | null = null;

  try {
    mkdirSync(input.tempDirectory, { recursive: true });
    zipFile = await yauzl.openPromise(input.zipPath, {
      lazyEntries: true,
      decodeStrings: false,
      validateEntrySizes: true,
      autoClose: true,
    });
    opened = true;

    try {
      for await (const entry of zipFile.eachEntry()) {
        const decoded = decodeEntryName(entry.fileNameRaw);
        if (!isSafeEntryPath(decoded.filename)) {
          const entryIndex = entryCount;
          entryCount += 1;
          incomplete = true;
          entries.push(failedEntry(entryIndex, decoded.filename, decoded.fallback));
          continue;
        }
        if (isDirectoryEntry(decoded.filename)) continue;
        const entryIndex = entryCount;
        entryCount += 1;

        const tempPath = join(input.tempDirectory, `${uuidv4()}.upload`);
        try {
          await extractEntry(zipFile, entry, tempPath, input.maximumEntryBytes);
          const stored = await input.intakeEntry({
            path: tempPath,
            original_filename: decoded.filename,
            filename_decoding_fallback: decoded.fallback,
          });
          entries.push({
            entry_index: entryIndex,
            original_filename: decoded.filename,
            filename_decoding_fallback: decoded.fallback,
            status: 'succeeded',
            content_hash: stored.content_hash,
            source_record_id: stored.source_record_id,
            source_file_id: stored.source_file_id,
          });
        } catch {
          incomplete = true;
          entries.push(failedEntry(entryIndex, decoded.filename, decoded.fallback));
        } finally {
          rmSync(tempPath, { force: true });
        }
      }
    } catch {
      incomplete = true;
    }
  } catch {
    incomplete = true;
  } finally {
    try {
      zipFile?.close();
    } catch {
      // The async iterator may already have auto-closed the archive.
    }
  }

  return {
    kind: 'zip',
    opened,
    incomplete,
    entry_count: entryCount,
    entries,
  };
}
