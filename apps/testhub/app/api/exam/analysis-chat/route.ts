import { NextResponse } from 'next/server';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const dynamic = 'force-dynamic';

function getBedrockClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });
  }
  return new BedrockRuntimeClient({ region });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, examContext, contextData } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const client = getBedrockClient();

    // Prepare system prompt with authentic candidate performance metrics
    const ctx = examContext || contextData || {};
    const systemPrompt = `You are TestHub's elite AI Performance Tutor.
The student has just completed a CBT examination session and is viewing their detailed analytics.

Here are the candidate's authentic test results for this paper:
- Paper Title: ${ctx.paperTitle || 'Examination Paper'}
- Subject: ${ctx.subject || 'All Subjects'}
- Overall Score: ${ctx.scoreAwarded ?? 0} / ${ctx.totalMarks ?? 0} marks (${ctx.percentage ?? 0}%)
- Time Spent: ${ctx.timeSpentMinutes ?? 0} minutes (Average: ${ctx.avgTimePerQuestionSeconds ?? 0}s per question)
- Weakest Topics needing attention: ${(ctx.weakTopics || []).map((t: any) => `${t.name} (${t.accuracy}% accuracy)`).join(', ') || 'None identified'}
- Strongest Topics: ${(ctx.strongTopics || []).map((t: any) => `${t.name} (${t.accuracy}% accuracy)`).join(', ') || 'General'}

Your goals:
1. Provide encouraging, concise, actionable advice based on their real performance data.
2. If the student asks about a concept or question, explain it clearly with step-by-step logic and standard LaTeX formulas (e.g., $E = mc^2$, $\\frac{a}{b}$).
3. Offer concrete exam strategies (how to avoid negative marking, time pacing, question selection).
4. Keep answers focused, motivating, and easy to read with bullet points when helpful.`;

    // Format Bedrock converse messages
    const bedrockMessages: Array<{ role: 'user' | 'assistant'; content: Array<{ text: string }> }> =
      messages.map((m: any) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: [{ text: String(m.content || '') }],
      }));

    let reply = '';

    // Primary: Nova Lite for fast conversational performance
    try {
      const command = new ConverseCommand({
        modelId: 'amazon.nova-lite-v1:0',
        system: [{ text: systemPrompt }],
        messages: bedrockMessages,
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.7,
        },
      });
      const response = await client.send(command);
      reply = response.output?.message?.content?.[0]?.text || '';
    } catch (novaErr: any) {
      console.warn('[AnalysisChatAPI] Nova Lite fallback, trying Claude 3.5 Haiku...', novaErr?.message);
      // Fallback: Claude Haiku
      const haikuCommand = new ConverseCommand({
        modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        system: [{ text: systemPrompt }],
        messages: bedrockMessages,
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.7,
        },
      });
      const response = await client.send(haikuCommand);
      reply = response.output?.message?.content?.[0]?.text || '';
    }

    if (!reply) {
      reply = `Based on your exam attempt in ${ctx.paperTitle || 'this paper'}, your current score is ${ctx.scoreAwarded} marks. To raise your accuracy, prioritize reviewing ${(ctx.weakTopics || []).map((t: any) => t.name).join(', ') || 'core conceptual questions'} and solve 10-15 targeted practice problems.`;
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('[AnalysisChatAPI] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'AI Tutor is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
