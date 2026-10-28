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
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }
    const { query, messages, contextData, contextType } = body || {};

    const chatMessages = Array.isArray(messages) && messages.length > 0
      ? messages
      : query
      ? [{ role: 'user', content: query }]
      : [];

    if (chatMessages.length === 0) {
      return NextResponse.json({ error: 'A query or messages array is required' }, { status: 400 });
    }

    const client = getBedrockClient();
    const ctx = contextData || {};
    const subject = ctx.subject || 'All Subjects';
    const topic = ctx.topic || 'General Practice';
    const questionsCount = ctx.questionsCount || 0;

    let systemPrompt = '';
    if (contextType === 'analysis') {
      systemPrompt = `You are TestHub's elite AI CBT Performance Tutor.
The student is analyzing their examination performance telemetry.
- Paper Title: ${ctx.paperTitle || 'Examination Paper'}
- Subject: ${subject}
- Score: ${ctx.scoreAwarded ?? 0} / ${ctx.totalMarks ?? 0} (${ctx.percentage ?? 0}%)
- Weak Topics: ${(ctx.weakTopics || []).map((t: any) => `${t.name} (${t.accuracy}%)`).join(', ') || 'None'}
- Strong Topics: ${(ctx.strongTopics || []).map((t: any) => `${t.name} (${t.accuracy}%)`).join(', ') || 'None'}
Provide actionable, motivating, and mathematically rigorous guidance with LaTeX formatting ($...$).`;
    } else {
      systemPrompt = `You are TestHub's master competitive exam (JEE Main / JEE Advanced / NEET) AI Topic Tutor.
The student is currently practicing topic-wise questions in:
- Subject: ${subject}
- Topic: ${topic}
${questionsCount ? `- Total Questions in this Bank: ${questionsCount}` : ''}

Your Mission:
1. Help the student understand core physical principles, mathematical theorems, or chemical mechanisms for this topic.
2. If asked for formulas, summarize the most critical high-yield formulas with concise variable definitions.
3. If asked about how to approach questions or numerical problems, break down the step-by-step methodology and shortcut techniques.
4. Point out common traps, sign convention errors, or negative marking pitfalls relevant to this topic.
5. ALWAYS format mathematical and scientific expressions cleanly using LaTeX notation, enclosing inline math in single dollar signs (e.g. $F = ma$, $\\int x dx$) and block equations in double dollar signs ($$ ... $$).
6. Be concise, highly professional, encouraging, and academically rigorous.`;
    }

    const bedrockMessages: Array<{ role: 'user' | 'assistant'; content: Array<{ text: string }> }> =
      chatMessages.map((m: any) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: [{ text: String(m.content || '') }],
      }));

    let reply = '';

    // Primary: Amazon Nova Lite
    try {
      const command = new ConverseCommand({
        modelId: 'amazon.nova-lite-v1:0',
        system: [{ text: systemPrompt }],
        messages: bedrockMessages,
        inferenceConfig: {
          maxTokens: 1200,
          temperature: 0.6,
        },
      });
      const response = await client.send(command);
      reply = response.output?.message?.content?.[0]?.text || '';
    } catch (novaErr: any) {
      console.warn('[TestHubChat] Nova Lite fallback, trying Claude 3.5 Haiku...', novaErr?.message);
      // Secondary Fallback: Claude 3.5 Haiku
      try {
        const haikuCommand = new ConverseCommand({
          modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
          system: [{ text: systemPrompt }],
          messages: bedrockMessages,
          inferenceConfig: {
            maxTokens: 1200,
            temperature: 0.6,
          },
        });
        const response = await client.send(haikuCommand);
        reply = response.output?.message?.content?.[0]?.text || '';
      } catch (haikuErr: any) {
        console.error('[TestHubChat] Bedrock invocation error:', haikuErr?.message);
      }
    }

    if (!reply) {
      reply = `In **${topic}** (${subject}), focus on mastering the fundamental equations and standard boundary conditions. If you have questions about any specific problem, feel free to ask for step-by-step breakdown!`;
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('[TestHubChatAPI] Handler error:', err);
    return NextResponse.json(
      { error: 'An error occurred while generating tutor guidance.' },
      { status: 500 }
    );
  }
}
