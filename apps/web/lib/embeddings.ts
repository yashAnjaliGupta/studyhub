import { prisma, type PrismaClient } from "@repo/db/client";
import {
  sanitizeText,
  chunkText,
  TitanV2EmbeddingProvider,
  getBedrockClient,
  type EmbeddingProvider,
  type PageChunk,
  type PageText,
} from "@repo/ai";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

export {
  sanitizeText,
  chunkText,
  TitanV2EmbeddingProvider,
  type EmbeddingProvider,
  type PageChunk,
  type PageText,
};

export async function extractPdfPagesText(pdfBuffer: Buffer): Promise<PageText[]> {
  if (typeof globalThis.DOMMatrix === "undefined") {
    try {
      const canvas = await import("@napi-rs/canvas");
      if (canvas.DOMMatrix) (globalThis as any).DOMMatrix = canvas.DOMMatrix;
      if (canvas.DOMPoint) (globalThis as any).DOMPoint = canvas.DOMPoint;
      if (canvas.DOMRect) (globalThis as any).DOMRect = canvas.DOMRect;
      if (canvas.Path2D) (globalThis as any).Path2D = canvas.Path2D;
      if (canvas.ImageData) (globalThis as any).ImageData = canvas.ImageData;
    } catch (e) {
      console.warn("[Embeddings] Could not load @napi-rs/canvas polyfill:", e);
    }
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  const pdfResult = await parser.getText();

  const pages: PageText[] = [];

  for (const pageItem of pdfResult.pages || []) {
    const trimmed = sanitizeText(pageItem.text || "").trim();
    const chunks = chunkText(trimmed);

    pages.push({
      pageNumber: pageItem.num,
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

      // Extract vector diagram SVGs if chunk contains visual / diagram indicators
      const visuals = await extractVisualSvgForChunk(sanitizedChunkText);
      const visualsJsonStr = visuals.visualsJson ? JSON.stringify(visuals.visualsJson) : null;

      if (fileId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PageEmbedding" (
            "id", "fileId", "pageNumber", "chunkIndex", "text", 
            "diagramSvg", "visualsJson", "hasVisuals", "embedding", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS jsonb), $8, $9::vector, NOW())`,
          id,
          fileId,
          chunk.pageNumber,
          chunk.chunkIndex,
          sanitizedChunkText,
          visuals.diagramSvg,
          visualsJsonStr,
          visuals.hasVisuals,
          vectorSqlStr
        );
      } else if (chapterId) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PageEmbedding" (
            "id", "chapterId", "pageNumber", "chunkIndex", "text", 
            "diagramSvg", "visualsJson", "hasVisuals", "embedding", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS jsonb), $8, $9::vector, NOW())`,
          id,
          chapterId,
          chunk.pageNumber,
          chunk.chunkIndex,
          sanitizedChunkText,
          visuals.diagramSvg,
          visualsJsonStr,
          visuals.hasVisuals,
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

/**
 * Detects if a text chunk describes a diagram, circuit, graph, or visual setup,
 * and uses Bedrock Claude to generate the inline vector SVG representation.
 */
export async function extractVisualSvgForChunk(_chunkText: string): Promise<{
  diagramSvg: string | null;
  visualsJson: any | null;
  hasVisuals: boolean;
}> {
  // SVG vector generation from PDF text has been deprecated in favor of authentic extracted raster images
  return { diagramSvg: null, visualsJson: null, hasVisuals: false };
}
