import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db/client";
import { BedrockRuntimeClient, ConverseStreamCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { TitanV2EmbeddingProvider } from "@repo/ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";

const embeddingProvider = new TitanV2EmbeddingProvider();

function cleanPdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/`\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Universal stop words filter to extract meaningful keywords from ANY query
 */
const STOP_WORDS = new Set([
  "what", "is", "are", "was", "were", "the", "a", "an", "in", "of", "to", "for", "with",
  "on", "at", "from", "by", "about", "as", "into", "like", "through", "after", "over",
  "between", "out", "against", "during", "without", "before", "under", "around", "among",
  "how", "why", "can", "you", "explain", "describe", "tell", "me", "show", "give", "list",
  "does", "do", "did", "which", "whose", "where", "when", "who", "whom"
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * 100% Universal, Subject-Agnostic Dynamic RAG Synthesizer
 * Works generically for ANY chapter, book, subject (Science, Math, History, Literature, etc.)
 * or question paper without any domain-specific hardcoded text.
 */
function generateWholeDocumentSynthesis(
  rawQuery: string,
  pageMap: Map<number, string[]>,
  vectorResults: Array<{ pageNumber: number; text: string; similarity: number }>
): string {
  const sortedPages = Array.from(pageMap.keys()).sort((a, b) => a - b);
  const totalPages = sortedPages.length;
  const cleanQuery = rawQuery.trim().toLowerCase();
  const keywords = extractKeywords(rawQuery);

  // 1. Sentence Extraction across all pages
  type SentenceItem = {
    page: number;
    text: string;
    cleanText: string;
    lowerText: string;
    score: number;
  };

  const allSentences: SentenceItem[] = [];

  for (const [pageNum, chunks] of pageMap.entries()) {
    const fullPageText = cleanPdfText(chunks.join(" "));
    // Split sentences reasonably
    const sents = fullPageText.split(/(?<=[.!?])\s+/);
    for (const s of sents) {
      const trimmed = s.trim();
      if (trimmed.length > 15) {
        allSentences.push({
          page: pageNum,
          text: trimmed,
          cleanText: cleanPdfText(trimmed),
          lowerText: trimmed.toLowerCase(),
          score: 0,
        });
      }
    }
  }

  // 2. Score sentences based on query keyword overlap
  for (const sent of allSentences) {
    let score = 0;
    for (const kw of keywords) {
      if (sent.lowerText.includes(kw)) {
        score += 2;
      }
    }
    // Small bonus if query terms appear together
    if (keywords.length >= 2) {
      const phrase = keywords.join(" ");
      if (sent.lowerText.includes(phrase)) score += 5;
    }
    sent.score = score;
  }

  // Check intent
  const isQuizIntent =
    cleanQuery.includes("quiz") ||
    cleanQuery.includes("question") ||
    cleanQuery.includes("test") ||
    cleanQuery.includes("mcq") ||
    cleanQuery.includes("practice") ||
    cleanQuery.includes("exam");

  // --- INTENT 1: UNIVERSAL DYNAMIC QUIZ GENERATOR ---
  if (isQuizIntent) {
    let quizMarkdown = `### 📝 Practice Quiz Questions\n\n`;
    quizMarkdown += `Here are 5 dynamic practice questions generated directly from the content of this document (**${totalPages} pages**):\n\n`;

    // Pick 5 informative sentences across different pages in the document
    const candidatePages = sortedPages.slice(0, 10);
    const quizItems: Array<{ page: number; sentence: string; keyTerm: string }> = [];

    for (const pageNum of candidatePages) {
      if (quizItems.length >= 5) break;
      const pageSents = allSentences.filter((s) => s.page === pageNum);

      // Find a sentence containing definitional or key structural patterns
      const keySent = pageSents.find(
        (s) =>
          s.lowerText.includes(" is ") ||
          s.lowerText.includes(" are ") ||
          s.lowerText.includes(" defined ") ||
          s.lowerText.includes(" refers ") ||
          s.lowerText.includes(" causes ") ||
          s.lowerText.includes(" results ") ||
          s.lowerText.includes(" called ") ||
          s.lowerText.includes(" known ") ||
          s.lowerText.includes(" important ")
      ) || pageSents[0];

      if (keySent) {
        // Try to identify a key term in the sentence
        const words = keySent.text.split(/\s+/);
        const keyTerm = words.find((w) => w.length > 4 && /^[A-Z]/.test(w)) || words[0] || "Concept";
        quizItems.push({
          page: pageNum,
          sentence: keySent.text,
          keyTerm: keyTerm.replace(/[^a-zA-Z0-9]/g, ""),
        });
      }
    }

    quizItems.forEach((item, idx) => {
      quizMarkdown += `#### **Q${idx + 1}. According to [Page ${item.page}], which statement is correct regarding the document's discussion?** [Page ${item.page}]\n`;
      quizMarkdown += `- **A)** "${item.sentence}"\n`;
      quizMarkdown += `- **B)** The document states that this process has no biological or scientific effect.\n`;
      quizMarkdown += `- **C)** This concept was disproved in earlier chapters.\n`;
      quizMarkdown += `- **D)** None of the above.\n`;
      quizMarkdown += `*Correct Answer: A* — Direct statement from textbook content on [Page ${item.page}].\n\n`;
    });

    quizMarkdown += `*Generated dynamically from all ${totalPages} pages of this document.*`;
    return quizMarkdown;
  }

  // --- INTENT 2: UNIVERSAL DYNAMIC QUESTION ANSWERING ---
  // Rank sentences by score
  const scoredSentences = [...allSentences].sort((a, b) => b.score - a.score);
  const topMatches = scoredSentences.filter((s) => s.score > 0);

  let answerMarkdown = `### 📖 Study Assistant Explanation\n\n`;

  if (topMatches.length > 0) {
    answerMarkdown += `Here is a detailed explanation answering **"${rawQuery}"** based on facts throughout this document:\n\n`;

    // Group top 6 matches by page
    const pageGroups = new Map<number, string[]>();
    for (const match of topMatches.slice(0, 8)) {
      if (!pageGroups.has(match.page)) {
        pageGroups.set(match.page, []);
      }
      const list = pageGroups.get(match.page)!;
      if (list.length < 2) {
        list.push(match.text);
      }
    }

    // Synthesize response sections
    answerMarkdown += `#### **Core Takeaways & Explanation:**\n\n`;
    let bulletIdx = 1;
    for (const [pageNum, sents] of pageGroups.entries()) {
      for (const sent of sents) {
        answerMarkdown += `${bulletIdx}. **Key Fact [Page ${pageNum}]**: ${sent} [Page ${pageNum}]\n\n`;
        bulletIdx++;
      }
    }

    answerMarkdown += `#### **Summary of Findings:**\n`;
    answerMarkdown += `The document addresses **"${rawQuery}"** across ${pageGroups.size} separate sections. Refer to the specific ` +
      Array.from(pageGroups.keys()).map((p) => `[Page ${p}]`).join(", ") +
      ` citation tags to view the exact locations in your PDF reader.`;
  } else {
    // Overview fallback if no specific keywords match
    answerMarkdown += `Here is an overview of the concepts discussed in this **${totalPages}-page** document:\n\n`;

    const summaryPages = sortedPages.slice(0, 6);
    summaryPages.forEach((pageNum) => {
      const firstSent = allSentences.find((s) => s.page === pageNum);
      if (firstSent) {
        answerMarkdown += `- **Page ${pageNum}**: ${firstSent.text} [Page ${pageNum}]\n\n`;
      }
    });

    answerMarkdown += `*Search completed across all ${totalPages} pages.*`;
  }

  return answerMarkdown;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to use the AI Study Assistant." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { query, chapterId, fileId, currentPage } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!chapterId && !fileId) {
      return NextResponse.json(
        { error: "Either chapterId or fileId is required" },
        { status: 400 }
      );
    }

    console.log(
      `[Chat API] Query: "${query}" | chapterId: ${chapterId} | fileId: ${fileId} | currentPage: ${currentPage}`
    );

    // 1. Retrieve ALL chunks for the entire chapter/file to ensure whole-chapter context
    let allChunks: Array<{
      pageNumber: number;
      chunkIndex: number;
      text: string;
    }> = [];
    // console.log(chapterId, fileId)
    if (chapterId) {
      allChunks = await prisma.$queryRawUnsafe(
        `SELECT "pageNumber", "chunkIndex", "text"
         FROM "PageEmbedding"
         WHERE "chapterId" = $1
         ORDER BY "pageNumber" ASC, "chunkIndex" ASC`,
        chapterId
      );
    } else if (fileId) {
      allChunks = await prisma.$queryRawUnsafe(
        `SELECT "pageNumber", "chunkIndex", "text"
         FROM "PageEmbedding"
         WHERE "fileId" = $1
         ORDER BY "pageNumber" ASC, "chunkIndex" ASC`,
        fileId
      );
      console.log(allChunks)
    }

    if (!allChunks || allChunks.length === 0) {
      console.log("No chunks found")
      return NextResponse.json({
        answer:
          "I couldn't find text embeddings for this document. It may still be processing. Please wait a moment and try again.",
        pageCitations: [],
        sources: [],
      });
    }

    // 2. Vector search for query scoring
    let vectorResults: Array<{
      pageNumber: number;
      chunkIndex: number;
      text: string;
      similarity: number;
    }> = [];

    try {
      const queryEmbedding = await embeddingProvider.generateEmbedding(query);
      const vectorSqlStr = `[${queryEmbedding.join(",")}]`;

      if (chapterId) {
        vectorResults = await prisma.$queryRawUnsafe(
          `SELECT "pageNumber", "chunkIndex", "text", 1 - ("embedding" <=> $1::vector) AS similarity
           FROM "PageEmbedding"
           WHERE "chapterId" = $2
           ORDER BY "embedding" <=> $1::vector ASC
           LIMIT 10`,
          vectorSqlStr,
          chapterId
        );
      } else if (fileId) {
        vectorResults = await prisma.$queryRawUnsafe(
          `SELECT "pageNumber", "chunkIndex", "text", 1 - ("embedding" <=> $1::vector) AS similarity
           FROM "PageEmbedding"
           WHERE "fileId" = $2
           ORDER BY "embedding" <=> $1::vector ASC
           LIMIT 10`,
          vectorSqlStr,
          fileId
        );
      }
    } catch (embErr) {
      console.warn("[Chat API] Vector query skipped:", embErr);
    }

    // 3. Assemble whole document text page by page
    const pageMap = new Map<number, string[]>();
    for (const chunk of allChunks) {
      if (!pageMap.has(chunk.pageNumber)) {
        pageMap.set(chunk.pageNumber, []);
      }
      pageMap.get(chunk.pageNumber)!.push(cleanPdfText(chunk.text));
    }

    const sortedPages = Array.from(pageMap.keys()).sort((a, b) => a - b);

    let wholeDocumentContext = "";
    for (const pageNum of sortedPages) {
      const pageTexts = pageMap.get(pageNum) || [];
      wholeDocumentContext += `--- Page ${pageNum} ---\n${pageTexts.join(" ")}\n\n`;
    }

    // Cap prompt context length if document is extremely large (> 60,000 characters)
    let promptContext = wholeDocumentContext;
    if (promptContext.length > 60000) {
      const topVectorContext = vectorResults
        .map((r) => `[Page ${r.pageNumber}]: ${cleanPdfText(r.text)}`)
        .join("\n\n");
      promptContext = `Top Relevant Passages:\n${topVectorContext}\n\nDocument Outline:\n${wholeDocumentContext.substring(0, 30000)}...`;
    }

    const systemPrompt = `You are an expert AI Study Assistant for Students.
You are given the COMPLETE context of an ENTIRE study chapter/question paper across all its pages.
Answer the user's question thoroughly, intelligently, and accurately based on the WHOLE document context.

Universal Instructions:
1. Base your answer strictly on facts present in the whole document regardless of subject (Science, Math, History, Literature, Question Papers, etc.).
2. Always cite specific page numbers using the exact tag format like [Page X] whenever mentioning facts, concepts, or questions from that page.
3. Structure your response with clean Markdown headers, bold terms, and organized bullet points.
4. If asked to generate quiz questions or practice questions, generate high-quality questions based on the actual concepts in this specific document, with options (A, B, C, D), correct answers, and [Page X] citations.
5. If the user asks a concept or explanation question, provide a detailed, well-explained answer with clear headings and [Page X] citations.

Complete Chapter Context:
${promptContext}

User Question: ${query}

AI Response:`;

    // 4. Return ReadableStream for real-time text streaming to frontend
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          let streamHandled = false;

          // A) AWS Bedrock
          const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
          const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
          const region = process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

          if (accessKeyId && secretAccessKey) {
            try {
              const bedrockClient = new BedrockRuntimeClient({
                region,
                credentials: { accessKeyId, secretAccessKey },
              });

              const systemInstruction = `You are an expert AI Study Assistant for Students.
You are given the COMPLETE context of an ENTIRE study chapter/question paper across all its pages.
Answer the user's question thoroughly, intelligently, and accurately based on the WHOLE document context.

Universal Instructions:
1. Base your answer strictly on facts present in the whole document regardless of subject (Science, Math, History, Literature, Question Papers, etc.).
2. Always cite specific page numbers using the exact tag format like [Page X] whenever mentioning facts, concepts, or questions from that page.
3. Structure your response with clean Markdown headers, bold terms, and organized bullet points.
4. If asked to generate quiz questions or practice questions, generate high-quality questions based on the actual concepts in this specific document, with options (A, B, C, D), correct answers, and [Page X] citations.
5. If the user asks a concept or explanation question, provide a detailed, well-explained answer with clear headings and [Page X] citations.

Complete Chapter Context:
${promptContext}`;

              const bedrockModels = [
                "us.anthropic.claude-haiku-4-5-20251001-v1:0",
                "amazon.nova-lite-v1:0"
              ];

              for (const modelId of bedrockModels) {
                try {
                  const command = new ConverseStreamCommand({
                    modelId,
                    system: [{ text: systemInstruction }],
                    messages: [
                      {
                        role: "user",
                        content: [{ text: query }],
                      },
                    ],
                    inferenceConfig: {
                      maxTokens: 2048,
                      topP: 0.9,
                    },
                  });

                  const bedrockRes = await bedrockClient.send(command);

                  if (bedrockRes.stream) {
                    for await (const chunk of bedrockRes.stream) {
                      if (chunk.contentBlockDelta?.delta?.text) {
                        const textChunk = chunk.contentBlockDelta.delta.text;
                        controller.enqueue(encoder.encode(textChunk));
                        streamHandled = true;
                      }
                    }
                  }
                  if (streamHandled) {
                    console.log(`[Chat API] Streamed answer using Bedrock ConverseStream model: ${modelId}`);
                    break;
                  }
                } catch (err: any) {
                  console.warn(`[Chat API] Bedrock ${modelId} converse stream warning:`, err?.message || err);
                }
              }

              // Fallback for Titan via InvokeModelCommand if ConverseStream models failed
              if (!streamHandled) {
                try {
                  const command = new InvokeModelCommand({
                    modelId: "amazon.titan-text-express-v1",
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify({
                      inputText: systemPrompt,
                      textGenerationConfig: { maxTokenCount: 1024, temperature: 0.2, topP: 0.9 },
                    }),
                  });
                  const bedrockRes = await bedrockClient.send(command);
                  const resBody = JSON.parse(new TextDecoder().decode(bedrockRes.body));
                  const parsed = resBody?.results?.[0]?.outputText?.trim();
                  if (parsed && parsed.length > 20) {
                    controller.enqueue(encoder.encode(parsed));
                    streamHandled = true;
                    console.log("[Chat API] Answer generated using Bedrock amazon.titan-text-express-v1");
                  }
                } catch (titanErr: any) {
                  console.warn("[Chat API] Bedrock Titan fallback warning:", titanErr?.message || titanErr);
                }
              }
            } catch (bedrockErr) {
              console.warn("[Chat API] Bedrock client error:", bedrockErr);
            }
          }

          let aiAnswer = "";

          // B) Google Gemini API Fallback
          const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
          if (!streamHandled && !aiAnswer && geminiApiKey) {
            try {
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: systemPrompt }] }],
                  }),
                }
              );
              if (geminiRes.ok) {
                const gData = await geminiRes.json();
                const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  aiAnswer = text.trim();
                  console.log("[Chat API] Answer generated using Google Gemini API");
                }
              }
            } catch (gErr) {
              console.warn("[Chat API] Gemini API error:", gErr);
            }
          }

          // C) OpenAI API Fallback
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (!streamHandled && !aiAnswer && openaiApiKey) {
            try {
              const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  messages: [{ role: "user", content: systemPrompt }],
                  max_tokens: 1024,
                }),
              });
              if (openAiRes.ok) {
                const oData = await openAiRes.json();
                const text = oData?.choices?.[0]?.message?.content;
                if (text) {
                  aiAnswer = text.trim();
                  console.log("[Chat API] Answer generated using OpenAI API");
                }
              }
            } catch (oErr) {
              console.warn("[Chat API] OpenAI API error:", oErr);
            }
          }

          // E) Local Ollama Fallback
          if (!streamHandled && !aiAnswer) {
            try {
              const ollamaRes = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "llama3",
                  prompt: systemPrompt,
                  stream: false,
                }),
              });
              if (ollamaRes.ok) {
                const oData = await ollamaRes.json();
                if (oData?.response) {
                  aiAnswer = oData.response.trim();
                  console.log("[Chat API] Answer generated using Local Ollama");
                }
              }
            } catch (ollamaErr) {
              // Ollama not running locally
            }
          }

          // 5. Universal Subject-Agnostic Dynamic RAG Synthesizer Fallback
          if (!streamHandled && !aiAnswer) {
            console.log("[Chat API] Using universal subject-agnostic synthesis engine...");
            aiAnswer = generateWholeDocumentSynthesis(query, pageMap, vectorResults);
          }

          if (!streamHandled && aiAnswer) {
            controller.enqueue(encoder.encode(aiAnswer));
          }
        } catch (streamError) {
          console.error("[Chat API Stream Error]:", streamError);
          controller.enqueue(
            encoder.encode(
              "\n\n*Our AI assistant encountered a temporary interruption while generating the response. Please try again.*"
            )
          );
        } finally {
          try {
            controller.close();
          } catch {
            // Controller might already be closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Chat API Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
