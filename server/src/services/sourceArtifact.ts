import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import * as mammoth from 'mammoth';
import {
  isSourceArtifactErrorRetryable,
  type SourceArtifactErrorCode,
} from './sourceMaterializationErrors.js';

export {
  isSourceArtifactErrorRetryable,
  type SourceArtifactErrorCode,
} from './sourceMaterializationErrors.js';

export type SourceArtifactWritingRole = 'paragraph' | 'heading';

export interface SourceArtifactBlock {
  artifact_block_id: string;
  kind: 'text';
  text: string;
  writing_role: SourceArtifactWritingRole;
  page_index: number | null;
  locator: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SourceArtifact {
  schema_version: 'source-artifact.v1';
  artifact_kind: 'document' | 'image';
  parser_key: string;
  parser_version: string;
  blocks: SourceArtifactBlock[];
  metadata: Record<string, unknown>;
}

export interface SourceParserInput {
  parser_key: string;
  parser_version: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
}

export interface SourceArtifactLimits {
  maxPdfPages: number;
  maxBlocks: number;
  maxZipExpansionRatio: number;
  timeoutMs: number;
}

export interface SourceParser {
  key: string;
  parse(input: SourceParserInput, limits: SourceArtifactLimits): Promise<SourceArtifact>;
}

export interface ParseSourceArtifactOptions {
  limits?: Partial<SourceArtifactLimits>;
  parser?: SourceParser;
}

const DEFAULT_LIMITS: SourceArtifactLimits = {
  maxPdfPages: 1000,
  maxBlocks: 5000,
  maxZipExpansionRatio: 5,
  timeoutMs: 120_000,
};

export class SourceArtifactError extends Error {
  readonly code: SourceArtifactErrorCode;
  readonly retryable: boolean;

  constructor(code: SourceArtifactErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'SourceArtifactError';
    this.code = code;
    this.retryable = isSourceArtifactErrorRetryable(code);
    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function limitsFrom(options: ParseSourceArtifactOptions): SourceArtifactLimits {
  return {
    maxPdfPages: Math.max(1, Math.trunc(options.limits?.maxPdfPages ?? DEFAULT_LIMITS.maxPdfPages)),
    maxBlocks: Math.max(1, Math.trunc(options.limits?.maxBlocks ?? DEFAULT_LIMITS.maxBlocks)),
    maxZipExpansionRatio: Math.max(1, options.limits?.maxZipExpansionRatio ?? DEFAULT_LIMITS.maxZipExpansionRatio),
    timeoutMs: Math.max(1, Math.trunc(options.limits?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs)),
  };
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[\t ]+\n/g, '\n').trim();
}

function splitParagraphs(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\n+/g, '\n').trim())
    .filter(Boolean);
}

function assertBlockLimit(blocks: SourceArtifactBlock[], limits: SourceArtifactLimits): SourceArtifactBlock[] {
  if (blocks.length > limits.maxBlocks) {
    throw new SourceArtifactError(
      'resource_limit',
      `Source produced ${blocks.length} blocks, exceeding the ${limits.maxBlocks} block limit`,
    );
  }
  return blocks;
}

function documentArtifact(
  input: SourceParserInput,
  blocks: SourceArtifactBlock[],
  metadata: Record<string, unknown> = {},
): SourceArtifact {
  return {
    schema_version: 'source-artifact.v1',
    artifact_kind: 'document',
    parser_key: input.parser_key,
    parser_version: input.parser_version,
    blocks,
    metadata,
  };
}

function findZipEndOfCentralDirectory(buffer: Buffer): number {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function assertDocxExpansionSafe(buffer: Buffer, limits: SourceArtifactLimits): void {
  const eocd = findZipEndOfCentralDirectory(buffer);
  if (eocd < 0) {
    throw new SourceArtifactError('invalid_or_corrupt', 'DOCX central directory is missing');
  }

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  let totalUncompressed = 0;
  let hasWordDocument = false;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new SourceArtifactError('invalid_or_corrupt', 'DOCX central directory is malformed');
    }
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    if (uncompressedSize === 0xffffffff) {
      throw new SourceArtifactError('resource_limit', 'ZIP64 DOCX files are not supported in this parser version');
    }
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) {
      throw new SourceArtifactError('invalid_or_corrupt', 'DOCX entry name exceeds the archive boundary');
    }
    const name = buffer.subarray(nameStart, nameEnd).toString('utf8').replace(/\\/g, '/');
    if (name === 'word/document.xml') hasWordDocument = true;
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > buffer.length * limits.maxZipExpansionRatio) {
      throw new SourceArtifactError(
        'resource_limit',
        `DOCX expanded size exceeds the ${limits.maxZipExpansionRatio}x archive limit`,
      );
    }
    cursor = nameEnd + extraLength + commentLength;
  }

  if (!hasWordDocument) {
    throw new SourceArtifactError('invalid_or_corrupt', 'DOCX does not contain word/document.xml');
  }
}

const pdfParser: SourceParser = {
  key: 'native-pdf',
  async parse(input, limits) {
    const data = await readFile(input.file_path);
    const pdfModule = await import('pdf-parse') as unknown as {
      PDFParse: new (options: { data: Buffer }) => {
        getInfo(): Promise<{ total: number }>;
        getText(): Promise<{
          total: number;
          pages: Array<{ num: number; text: string }>;
        }>;
        destroy(): Promise<void>;
      };
    };
    const { PDFParse } = pdfModule;
    const parser = new PDFParse({ data });
    try {
      const info = await parser.getInfo();
      if (info.total > limits.maxPdfPages) {
        throw new SourceArtifactError(
          'resource_limit',
          `PDF has ${info.total} pages, exceeding the ${limits.maxPdfPages} page limit`,
        );
      }
      const result = await parser.getText();
      const blocks = result.pages.flatMap((page: { num: number; text: string }) => (
        splitParagraphs(page.text).map((text, blockIndex): SourceArtifactBlock => ({
          artifact_block_id: `pdf-page-${page.num}-block-${blockIndex + 1}`,
          kind: 'text',
          text,
          writing_role: 'paragraph',
          page_index: page.num,
          locator: { kind: 'pdf_page', page_index: page.num, block_index: blockIndex + 1 },
          metadata: {},
        }))
      ));
      return documentArtifact(input, assertBlockLimit(blocks, limits), {
        page_count: result.total,
      });
    } catch (error) {
      if (error instanceof SourceArtifactError) throw error;
      throw new SourceArtifactError('invalid_or_corrupt', 'PDF could not be parsed', { cause: error });
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  },
};

const docxParser: SourceParser = {
  key: 'native-docx',
  async parse(input, limits) {
    const buffer = await readFile(input.file_path);
    assertDocxExpansionSafe(buffer, limits);
    try {
      const result = await mammoth.extractRawText({ buffer });
      const blocks = splitParagraphs(result.value).map((text, index): SourceArtifactBlock => ({
        artifact_block_id: `docx-paragraph-${index + 1}`,
        kind: 'text',
        text,
        writing_role: 'paragraph',
        page_index: null,
        locator: { kind: 'docx_paragraph', index: index + 1 },
        metadata: {},
      }));
      return documentArtifact(input, assertBlockLimit(blocks, limits), {
        parser_messages: result.messages.map((message) => ({ type: message.type, message: message.message })),
      });
    } catch (error) {
      if (error instanceof SourceArtifactError) throw error;
      throw new SourceArtifactError('invalid_or_corrupt', 'DOCX could not be parsed', { cause: error });
    }
  },
};

function markdownBlocks(value: string): SourceArtifactBlock[] {
  return splitParagraphs(value).map((rawText, index) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(rawText);
    return {
      artifact_block_id: `markdown-block-${index + 1}`,
      kind: 'text',
      text: heading ? heading[2].trim() : rawText,
      writing_role: heading ? 'heading' : 'paragraph',
      page_index: null,
      locator: { kind: 'markdown_block', index: index + 1 },
      metadata: heading ? { heading_level: heading[1].length } : {},
    } satisfies SourceArtifactBlock;
  });
}

const textParser: SourceParser = {
  key: 'native-text',
  async parse(input, limits) {
    const value = await readFile(input.file_path, 'utf8');
    const isMarkdown = ['.md', '.markdown'].includes(extname(input.original_filename).toLowerCase())
      || input.mime_type === 'text/markdown';
    const blocks = isMarkdown
      ? markdownBlocks(value)
      : splitParagraphs(value).map((text, index): SourceArtifactBlock => ({
        artifact_block_id: `text-paragraph-${index + 1}`,
        kind: 'text',
        text,
        writing_role: 'paragraph',
        page_index: null,
        locator: { kind: 'text_paragraph', index: index + 1 },
        metadata: {},
      }));
    return documentArtifact(input, assertBlockLimit(blocks, limits));
  },
};

const imageParser: SourceParser = {
  key: 'native-image',
  async parse(input) {
    const file = await stat(input.file_path);
    return {
      schema_version: 'source-artifact.v1',
      artifact_kind: 'image',
      parser_key: input.parser_key,
      parser_version: input.parser_version,
      blocks: [],
      metadata: {
        original_filename: input.original_filename,
        mime_type: input.mime_type,
        byte_size: file.size,
        locator: { kind: 'whole_image' },
      },
    };
  },
};

const PARSERS: Record<string, SourceParser> = {
  [pdfParser.key]: pdfParser,
  [docxParser.key]: docxParser,
  [textParser.key]: textParser,
  [imageParser.key]: imageParser,
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new SourceArtifactError('resource_limit', `Parser exceeded the ${timeoutMs}ms time limit`));
    }, timeoutMs);
    timeout.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function parseSourceArtifact(
  input: SourceParserInput,
  options: ParseSourceArtifactOptions = {},
): Promise<SourceArtifact> {
  const limits = limitsFrom(options);
  const parser = options.parser || PARSERS[input.parser_key];
  if (!parser || parser.key !== input.parser_key) {
    throw new SourceArtifactError('unsupported_format', `No Source parser is registered for ${input.parser_key}`);
  }

  try {
    const artifact = await withTimeout(parser.parse(input, limits), limits.timeoutMs);
    if (artifact.schema_version !== 'source-artifact.v1') {
      throw new SourceArtifactError('parser_failure', 'Parser returned an unsupported SourceArtifact version');
    }
    assertBlockLimit(artifact.blocks, limits);
    return artifact;
  } catch (error) {
    if (error instanceof SourceArtifactError) throw error;
    throw new SourceArtifactError('parser_failure', 'Source parser failed unexpectedly', { cause: error });
  }
}
