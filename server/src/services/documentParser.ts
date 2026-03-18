import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { getDb } from '../db/init.js';
import { getEmbeddingProvider } from '../embedding/index.js';
import { VectorStore } from '../embedding/vectorStore.js';

const CLAUDE_MODEL = 'claude-haiku-4-20250414';
const CHUNK_SIZE = 5000;
const MAX_TEXT_BEFORE_CHUNKING = 30000;
const PDF_BATCH_SIZE = 50;
const MAX_PDF_PAGES = 200;

/**
 * Get Anthropic client — reads API key from user Settings first, falls back to .env.
 * This allows users to configure their key in the Settings UI without needing a .env file.
 */
function getAnthropicClient(userId?: string): Anthropic {
  // Try user settings first
  if (userId) {
    try {
      const db = getDb();
      const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId) as { settings: string } | undefined;
      if (user?.settings) {
        const settings = JSON.parse(user.settings);
        const aiProviders = settings?.ai_providers as Record<string, Record<string, string>> | undefined;
        const anthropicConfig = aiProviders?.anthropic;
        if (anthropicConfig?.api_key) {
          return new Anthropic({ apiKey: anthropicConfig.api_key });
        }
      }
    } catch {
      // Fall through to env
    }
  }

  // Fallback to env (requires ANTHROPIC_API_KEY in .env)
  return new Anthropic();
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

async function parsePdfNative(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const data = await pdfParse(buffer);
  return { text: data.text, pageCount: data.numpages };
}

async function parsePdfWithVision(buffer: Buffer, userId?: string): Promise<{ text: string; pageCount: number }> {
  const client = getAnthropicClient(userId);

  // Get page count first
  const pdfDoc = await PDFDocument.load(buffer);
  const pageCount = pdfDoc.getPageCount();

  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`Document exceeds 200-page limit for OCR processing`);
  }

  // Process in batches of 50 pages
  const batchCount = Math.ceil(pageCount / PDF_BATCH_SIZE);
  const textParts: string[] = [];

  for (let i = 0; i < batchCount; i++) {
    const startPage = i * PDF_BATCH_SIZE;
    const endPage = Math.min((i + 1) * PDF_BATCH_SIZE, pageCount);

    // Extract batch pages into a new PDF
    const batchDoc = await PDFDocument.create();
    const pages = await batchDoc.copyPages(pdfDoc, Array.from({ length: endPage - startPage }, (_, idx) => startPage + idx));
    pages.forEach((page) => batchDoc.addPage(page));
    const batchBuffer = Buffer.from(await batchDoc.save());

    const base64 = batchBuffer.toString('base64');

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all the text content from this PDF document. Return only the extracted text, preserving the original structure as much as possible.',
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    textParts.push(text);

    // Rate limit delay between batches
    if (i < batchCount - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { text: textParts.join('\n'), pageCount };
}

async function parseImage(buffer: Buffer, filename: string, userId?: string): Promise<string> {
  const client = getAnthropicClient(userId);
  const base64 = buffer.toString('base64');
  const ext = getFileExtension(filename);
  const mediaTypeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const mediaType = mediaTypeMap[ext] || 'image/jpeg';

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Extract all the text content from this image. If it contains diagrams or figures, describe them briefly. Return only the extracted text.',
          },
        ],
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function chunkText(text: string, pageCount?: number): Array<{ content: string; heading: string | null; page_start: number | null; page_end: number | null }> {
  // If pageCount is provided and <= 50, don't chunk
  if (pageCount !== undefined && pageCount <= 50) {
    return [];
  }

  // If no pageCount and text is short, don't chunk
  if (pageCount === undefined && text.length <= MAX_TEXT_BEFORE_CHUNKING) {
    return [];
  }

  const chunks: Array<{ content: string; heading: string | null; page_start: number | null; page_end: number | null }> = [];

  // Check for form feed characters (PDF page separators)
  const hasPageBreaks = text.includes('\f');

  if (hasPageBreaks) {
    // Page-aware chunking for PDFs
    const pages = text.split('\f');
    let currentChunk = '';
    let currentHeading: string | null = null;
    let chunkStartPage = 1;
    let currentPage = 1;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      currentPage = i + 1;

      if (currentChunk.length + page.length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), heading: currentHeading, page_start: chunkStartPage, page_end: currentPage - 1 });
        currentChunk = '';
        currentHeading = null;
        chunkStartPage = currentPage;
      }

      // Detect heading-like content
      const firstLine = page.trim().split('\n')[0] || '';
      if (firstLine.length < 100 && (firstLine.startsWith('#') || firstLine === firstLine.toUpperCase()) && firstLine.length > 0 && !currentHeading) {
        currentHeading = firstLine.replace(/^#+\s*/, '').trim();
      }

      currentChunk += page + '\f';
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({ content: currentChunk.trim(), heading: currentHeading, page_start: chunkStartPage, page_end: currentPage });
    }
  } else {
    // Paragraph-based chunking (non-PDF or no page markers)
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let currentHeading: string | null = null;

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), heading: currentHeading, page_start: null, page_end: null });
        currentChunk = '';
        currentHeading = null;
      }

      // Detect heading-like paragraphs
      if (para.length < 100 && (para.startsWith('#') || para === para.toUpperCase()) && !currentHeading) {
        currentHeading = para.replace(/^#+\s*/, '').trim();
      }

      currentChunk += para + '\n\n';
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({ content: currentChunk.trim(), heading: currentHeading, page_start: null, page_end: null });
    }
  }

  return chunks;
}

async function generateSummary(
  text: string,
  userId?: string
): Promise<{ summary: string; documentType: string }> {
  const client = getAnthropicClient(userId);
  const truncated = text.slice(0, 10000);

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize this document in 2-3 sentences for a student studying this material. Also classify the document as one of: textbook, notes, slides, problem_set, reference, other.

Respond in this exact JSON format:
{"summary": "...", "document_type": "..."}

Document text:
${truncated}`,
      },
    ],
  });

  const responseText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'No summary generated.',
        documentType: parsed.document_type || 'other',
      };
    }
  } catch {
    // Fall through to default
  }

  return { summary: responseText.slice(0, 500), documentType: 'other' };
}

export async function parseDocument(documentId: string, userId: string): Promise<void> {
  const db = getDb();

  // Update status to parsing
  db.prepare("UPDATE documents SET parse_status = 'parsing', updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    documentId
  );

  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId) as {
      id: string;
      filename: string;
      file_path: string;
      file_type: string;
    };

    if (!doc) {
      throw new Error('Document not found');
    }

    const buffer = await readFile(doc.file_path);
    const ext = getFileExtension(doc.filename);

    let extractedText = '';
    let parseChannel = 'native';
    let pageCount: number | null = null;

    // Parse based on file type
    if (ext === 'pdf') {
      try {
        const native = await parsePdfNative(buffer);
        if (native.text.trim().length > 100) {
          extractedText = native.text;
          parseChannel = 'native';
          pageCount = native.pageCount;
        } else {
          throw new Error('Insufficient text extracted — likely scanned');
        }
      } catch {
        const vision = await parsePdfWithVision(buffer, userId);
        extractedText = vision.text;
        parseChannel = 'ocr';
        pageCount = vision.pageCount;
      }
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
      parseChannel = 'native';
    } else if (ext === 'xlsx') {
      const workbook = XLSX.read(buffer);
      extractedText = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        return `## ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join('\n\n');
      parseChannel = 'native';
    } else if (isImageFile(doc.filename)) {
      extractedText = await parseImage(buffer, doc.filename, userId);
      parseChannel = 'ocr';
    } else if (ext === 'txt' || ext === 'md') {
      extractedText = buffer.toString('utf-8');
      parseChannel = 'native';
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Chunking
    const chunks = chunkText(extractedText, pageCount ?? undefined);
    const chunkCount = chunks.length;

    if (chunkCount > 0) {
      const insertChunk = db.prepare(
        'INSERT INTO document_chunks (id, document_id, chunk_index, content, heading, page_start, page_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items: typeof chunks) => {
        items.forEach((chunk, index) => {
          insertChunk.run(
            uuidv4(),
            documentId,
            index,
            chunk.content,
            chunk.heading,
            chunk.page_start,
            chunk.page_end,
            new Date().toISOString()
          );
        });
      });
      insertMany(chunks);
    }

    // AI summary
    let summary = '';
    let documentType = 'other';
    try {
      const result = await generateSummary(extractedText, userId);
      summary = result.summary;
      documentType = result.documentType;
    } catch {
      summary = 'Summary generation failed.';
    }

    // Update document record
    db.prepare(
      `UPDATE documents SET
        parse_status = 'completed',
        parse_channel = ?,
        extracted_text = ?,
        summary = ?,
        page_count = ?,
        document_type = ?,
        chunk_count = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      parseChannel,
      extractedText,
      summary,
      pageCount,
      documentType,
      chunkCount,
      new Date().toISOString(),
      documentId
    );

    // Generate embeddings asynchronously (don't block parse completion)
    generateChunkEmbeddings(documentId, userId).catch((embErr) => {
      console.warn(`Embedding generation failed for document ${documentId}:`, embErr);
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
    db.prepare(
      "UPDATE documents SET parse_status = 'failed', error_message = ?, updated_at = ? WHERE id = ?"
    ).run(errorMessage, new Date().toISOString(), documentId);
  }
}

/**
 * Generate embeddings for all chunks of a document and store in vec table.
 */
async function generateChunkEmbeddings(documentId: string, userId: string): Promise<void> {
  const provider = getEmbeddingProvider(userId);
  if (!provider) {
    console.warn('No embedding provider configured — skipping chunk embeddings');
    return;
  }

  const db = getDb();
  const chunks = db
    .prepare('SELECT id, content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index')
    .all(documentId) as Array<{ id: string; content: string }>;

  if (chunks.length === 0) {
    // No chunks — embed the full extracted_text as a single "virtual" chunk
    // (small documents aren't chunked but we still want them searchable)
    const doc = db.prepare('SELECT id, extracted_text FROM documents WHERE id = ?').get(documentId) as { id: string; extracted_text: string | null } | undefined;
    if (!doc?.extracted_text) return;

    const embeddings = await provider.embed([doc.extracted_text], 'document');
    if (embeddings.length > 0) {
      // Store using the document ID as chunk_id (convention for un-chunked docs)
      const store = new VectorStore();
      store.upsertChunkEmbeddings([{ id: doc.id, embedding: embeddings[0] }]);
    }
    return;
  }

  const texts = chunks.map((c) => c.content);
  const embeddings = await provider.embed(texts, 'document');

  const store = new VectorStore();
  const items = chunks.map((chunk, i) => ({
    id: chunk.id,
    embedding: embeddings[i],
  }));
  store.upsertChunkEmbeddings(items);

  console.log(`Generated embeddings for ${items.length} chunks of document ${documentId}`);
}
