import { InvokeModelCommand, type BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient } from "./bedrock";

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

// Pluggable Embedding Provider Interface
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

  constructor(client?: BedrockRuntimeClient) {
    this.client = client || getBedrockClient();
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
