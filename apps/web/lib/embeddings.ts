import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { PrismaClient } from "@repo/db/client";

export function sanitizeText(text: string): string {
  if (!text) return "";
  const wellFormed =
    typeof (text as any).toWellFormed === "function"
      ? (text as any).toWellFormed()
      : text.replace(
          /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
          "\uFFFD"
        );
  return wellFormed.replace(/\0/g, "");
}

// Pluggable Embedding Provider Interface for Future-Proofing
export interface EmbeddingProvider {
  name: string;
  dimension: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[], batchSize?: number): Promise<number[][]>;
}

// Amazon Titan Text Embeddings V2 Implementation (1024 Dimensions)
export class TitanV2EmbeddingProvider implements EmbeddingProvider {
  name = "Amazon Titan Text Embeddings V2";
  dimension = 1024;
  private client: BedrockRuntimeClient;

  constructor() {
    const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

    this.client = new BedrockRuntimeClient({
      region,
      ...(accessKeyId && secretAccessKey
        ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
        : {}),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cleanInput = sanitizeText(text);
    const payload = {
      inputText: cleanInput,
      dimensions: this.dimension,
      normalize: true,
    };

    const command = new InvokeModelCommand({
      modelId: "amazon.titan-embed-text-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.embedding;
  }

  async generateBatchEmbeddings(texts: string[], batchSize = 5): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);
      const batchIndices = batchTexts.map((_, idx) => i + idx);

      const promises = batchTexts.map((text) => this.generateEmbedding(text));
      const settled = await Promise.allSettled(promises);

      settled.forEach((res, idx) => {
        const targetIndex = batchIndices[idx]!;
        if (res.status === "fulfilled") {
          results[targetIndex] = res.value;
        } else {
          console.error(`[EmbeddingError] Failed chunk embedding index ${targetIndex}:`, res.reason);
          throw res.reason;
        }
      });
    }

    return results;
  }
}

export type PageChunk = {
  index: number;
  text: string;
};

export type PageText = {
  pageNumber: number;
  text: string;
  chunks: PageChunk[];
};

export function chunkText(pageText: string, maxChunkSize = 800, overlap = 100): PageChunk[] {
  const sanitized = sanitizeText(pageText);
  const trimmed = sanitized.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChunkSize) {
    return [{ index: 0, text: trimmed }];
  }

  const chunks: PageChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + maxChunkSize, trimmed.length);

    if (end < trimmed.length) {
      const lastParagraph = trimmed.lastIndexOf("\n\n", end);
      if (lastParagraph > start + maxChunkSize * 0.5) {
        end = lastParagraph + 2;
      } else {
        const lastPeriod = trimmed.lastIndexOf(". ", end);
        if (lastPeriod > start + maxChunkSize * 0.5) {
          end = lastPeriod + 2;
        }
      }
    }

    const chunkContent = sanitizeText(trimmed.substring(start, end).trim());
    if (chunkContent.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: chunkContent,
      });
    }

    if (end >= trimmed.length) break;
    start = end - overlap;
  }

  return chunks;
}

export async function extractPdfPagesText(pdfBuffer: Buffer): Promise<PageText[]> {
  const pages: PageText[] = [];

  const uint8Array = new Uint8Array(
    pdfBuffer.buffer,
    pdfBuffer.byteOffset,
    pdfBuffer.byteLength
  );

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdfDoc = await loadingTask.promise;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    let pageText = "";
    let lastY: number | null = null;

    for (const item of textContent.items) {
      if ("str" in item) {
        const transform = (item as any)?.transform;
        const currentY = Array.isArray(transform) && transform.length >= 6 ? transform[5] : null;
        if (currentY !== null && lastY !== null && Math.abs(lastY - currentY) > 5) {
          pageText += "\n";
        }
        pageText += sanitizeText(item.str) + " ";
        if (currentY !== null) {
          lastY = currentY;
        }
      }
    }

    const trimmed = sanitizeText(pageText).trim();
    const chunks = chunkText(trimmed);

    pages.push({
      pageNumber: pageNum,
      text: trimmed,
      chunks,
    });
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  return pages;
}

export async function processDocumentEmbeddings({
  fileId,
  chapterId,
  pdfUrl,
  provider = new TitanV2EmbeddingProvider(),
}: {
  fileId?: number;
  chapterId?: number;
  pdfUrl: string;
  provider?: EmbeddingProvider;
}): Promise<void> {
  const prisma = new PrismaClient();
  try {
    console.log(`[Embeddings] Starting extraction & vector generation for ${fileId ? `fileId: ${fileId}` : `chapterId: ${chapterId}`}`);

    // 1. Fetch PDF buffer
    const res = await fetch(pdfUrl);
    console.log(pdfUrl)
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF from ${pdfUrl}: ${res.statusText}`);
    }
    console.log(res);
    const arrayBuffer = await res.arrayBuffer();
    console.log(arrayBuffer)
    const pdfBuffer = Buffer.from(arrayBuffer);
    console.log(pdfBuffer)
    // 2. Extract pages & chunks
    const pages = await extractPdfPagesText(pdfBuffer);
    console.log(`[Embeddings] Extracted ${pages.length} pages from PDF`);

    type FlatChunk = {
      pageNumber: number;
      chunkIndex: number;
      text: string;
    };

    const flatChunks: FlatChunk[] = [];
    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) continue;
      for (const chunk of page.chunks) {
        const cleanChunkText = sanitizeText(chunk.text).trim();
        if (cleanChunkText.length > 0) {
          flatChunks.push({
            pageNumber: page.pageNumber,
            chunkIndex: chunk.index,
            text: cleanChunkText,
          });
        }
      }
    }

    if (flatChunks.length === 0) {
      console.warn(`[Embeddings] No text chunks found in document`);
      await updateDocStatus(prisma, fileId, chapterId, "COMPLETED");
      return;
    }

    // 3. Batch generate embeddings using Provider
    console.log(`[Embeddings] Generating embeddings for ${flatChunks.length} chunks via ${provider.name}...`);
    const chunkTexts = flatChunks.map((c) => c.text);
    const embeddings = await provider.generateBatchEmbeddings(chunkTexts, 5);
    console.log("______________________________________");
    // 4. Save PageEmbedding records into Database via raw SQL for pgvector
    console.log(`[Embeddings] Saving ${embeddings.length} vector embeddings to pgvector DB...`);

    for (let i = 0; i < flatChunks.length; i++) {
      const chunk = flatChunks[i];
      const vectorArray = embeddings[i];
      if (!chunk || !vectorArray) continue;

      const vectorSqlStr = `[${vectorArray.join(",")}]`;
      const id = `emb_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
      const sanitizedChunkText = sanitizeText(chunk.text);

      if (fileId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PageEmbedding" ("id", "fileId", "pageNumber", "chunkIndex", "text", "embedding", "createdAt") VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())`,
          id,
          fileId,
          chunk.pageNumber,
          chunk.chunkIndex,
          sanitizedChunkText,
          vectorSqlStr
        );
      } else if (chapterId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PageEmbedding" ("id", "chapterId", "pageNumber", "chunkIndex", "text", "embedding", "createdAt") VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())`,
          id,
          chapterId,
          chunk.pageNumber,
          chunk.chunkIndex,
          sanitizedChunkText,
          vectorSqlStr
        );
      }
    }

    // 5. Update Status to COMPLETED
    await updateDocStatus(prisma, fileId, chapterId, "COMPLETED");
    console.log(`[Embeddings] Successfully completed embedding generation for ${fileId ? `fileId: ${fileId}` : `chapterId: ${chapterId}`}`);
  } catch (error) {
    console.error(`[Embeddings] Processing failed:`, error);
    await updateDocStatus(prisma, fileId, chapterId, "FAILED");
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateDocStatus(
  prisma: PrismaClient,
  fileId?: number,
  chapterId?: number,
  status: "COMPLETED" | "FAILED" | "PROCESSING" = "COMPLETED"
) {
  if (fileId) {
    await prisma.file.update({
      where: { id: fileId },
      data: { status: status as any },
    });
  } else if (chapterId) {
    await prisma.bookChapter.update({
      where: { id: chapterId },
      data: { status },
    });
  }
}
