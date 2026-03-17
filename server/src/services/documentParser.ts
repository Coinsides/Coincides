import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { getDb } from '../db/init.js';

const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
const CHUNK_SIZE = 5000;
const MAX_TEXT_BEFORE_CHUNKING = 30000;

function getAnthropicClient(): Anthropic {
  return new Anthropic();
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

async function parsePdfNative(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const data = await pdfParse(buffer);
  return { text: data.text, pageCount: data.numpages };
}

async function parsePdfWithVision(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const client = getAnthropicClient();
  const base64 = buffer.toString('base64');

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
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

  // Try to get page count from native parse
  let pageCount = 1;
  try {
    const data = await pdfParse(buffer);
    pageCount = data.numpages;
  } catch {
    // Ignore — keep default
  }

  return { text, pageCount };
}

async function parseImage(buffer: Buffer, filename: string): Promise<string> {
  const client = getAnthropicClient();
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

function chunkText(text: string): Array<{ content: string; heading: string | null }> {
  if (text.length <= MAX_TEXT_BEFORE_CHUNKING) {
    return [];
  }

  const chunks: Array<{ content: string; heading: string | null }> = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  let currentHeading: string | null = null;

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({ content: currentChunk.trim(), heading: currentHeading });
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
    chunks.push({ content: currentChunk.trim(), heading: currentHeading });
  }

  return chunks;
}

async function generateSummary(
  text: string
): Promise<{ summary: string; documentType: string }> {
  const client = getAnthropicClient();
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

export async function parseDocument(documentId: string, _userId: string): Promise<void> {
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

    const buffer = readFileSync(doc.file_path);
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
        const vision = await parsePdfWithVision(buffer);
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
      extractedText = await parseImage(buffer, doc.filename);
      parseChannel = 'ocr';
    } else if (ext === 'txt' || ext === 'md') {
      extractedText = buffer.toString('utf-8');
      parseChannel = 'native';
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    // Chunking
    const chunks = chunkText(extractedText);
    const chunkCount = chunks.length;

    if (chunkCount > 0) {
      const insertChunk = db.prepare(
        'INSERT INTO document_chunks (id, document_id, chunk_index, content, heading, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items: typeof chunks) => {
        items.forEach((chunk, index) => {
          insertChunk.run(
            uuidv4(),
            documentId,
            index,
            chunk.content,
            chunk.heading,
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
      const result = await generateSummary(extractedText);
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
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
    db.prepare(
      "UPDATE documents SET parse_status = 'failed', error_message = ?, updated_at = ? WHERE id = ?"
    ).run(errorMessage, new Date().toISOString(), documentId);
  }
}
