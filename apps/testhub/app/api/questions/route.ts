import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectParam = searchParams.get('subject');
    const topicParam = searchParams.get('topic');
    const searchParam = searchParams.get('q')?.toLowerCase();

    // Determine query limit: when querying a specific topic, ensure limit is high enough (1000) to fetch all questions for that topic
    const limit = topicParam && topicParam !== 'all'
      ? 1000
      : Math.min(1000, Math.max(10, parseInt(searchParams.get('limit') || '500', 10)));

    // Base conditions excluding CBSE
    const andConditions: any[] = [
      {
        paper: {
          NOT: {
            OR: [
              { examType: { contains: 'CBSE', mode: 'insensitive' } },
              { title: { contains: 'CBSE', mode: 'insensitive' } },
            ],
          },
        },
      },
      {
        NOT: {
          OR: [
            { subject: { contains: 'CBSE', mode: 'insensitive' } },
          ],
        },
      },
    ];

    // Filter by topic directly in DB query if provided
    if (topicParam && topicParam !== 'all') {
      const trimmedTopic = topicParam.trim();
      andConditions.push({
        topic: {
          OR: [
            { name: { equals: trimmedTopic, mode: 'insensitive' } },
            { name: { contains: trimmedTopic, mode: 'insensitive' } },
          ],
        },
      });
    }

    // Filter by subject directly in DB query if provided
    if (subjectParam && subjectParam !== 'all') {
      const trimmedSubj = subjectParam.trim();
      andConditions.push({
        OR: [
          { subject: { contains: trimmedSubj, mode: 'insensitive' } },
          { topic: { subject: { contains: trimmedSubj, mode: 'insensitive' } } },
          { paper: { subject: { contains: trimmedSubj, mode: 'insensitive' } } },
        ],
      });
    }

    // Filter by search query directly in DB query if provided
    if (searchParam) {
      andConditions.push({
        OR: [
          { text: { contains: searchParam, mode: 'insensitive' } },
          { topic: { name: { contains: searchParam, mode: 'insensitive' } } },
        ],
      });
    }

    // Query questions with options, topic, and paper (excluding CBSE)
    const questions = await prisma.question.findMany({
      where: {
        AND: andConditions,
      },
      include: {
        topic: true,
        paper: {
          select: {
            id: true,
            title: true,
            examType: true,
            year: true,
            subject: true,
          },
        },
      },
      orderBy: [
        { paperId: 'asc' },
        { sequenceNum: 'asc' },
      ],
      take: limit,
    });

    // Subject Normalizer & Classifier
    function getAcademicSubject(q: any): string {
      if (q.subject && q.subject.trim()) {
        const s = q.subject.trim();
        if (!['JEE Main', 'JEE Advanced', 'NEET', 'CBSE'].includes(s)) return s;
      }
      if (q.topic?.subject && q.topic.subject.trim()) {
        const s = q.topic.subject.trim();
        if (!['JEE Main', 'JEE Advanced', 'NEET', 'CBSE'].includes(s)) return s;
      }
      if (q.paper?.subject && q.paper.subject.trim()) {
        const s = q.paper.subject.trim();
        if (!['JEE Main', 'JEE Advanced', 'NEET', 'CBSE'].includes(s)) return s;
      }
      return 'Mathematics';
    }

    // Grouping: Subject -> Topic -> Questions
    const subjectMap = new Map<string, Map<string, any[]>>();
    const flatQuestions: any[] = [];

    for (const q of questions) {
      // Exclude CBSE questions
      const isCbse =
        (q.paper?.examType && q.paper.examType.toUpperCase().includes('CBSE')) ||
        (q.paper?.title && q.paper.title.toUpperCase().includes('CBSE')) ||
        (q.subject && q.subject.toUpperCase().includes('CBSE')) ||
        (q.topic?.subject && q.topic.subject.toUpperCase().includes('CBSE'));

      if (isCbse) {
        continue;
      }

      const subject = getAcademicSubject(q);
      const topicName = q.topic?.name || 'General Concepts';

      // Memory filtering if specific filters are requested
      if (subjectParam && subjectParam !== 'all') {
        const matchSubj =
          subject.toLowerCase() === subjectParam.toLowerCase() ||
          (q.topic?.subject && q.topic.subject.toLowerCase() === subjectParam.toLowerCase()) ||
          (q.paper?.subject && q.paper.subject.toLowerCase().includes(subjectParam.toLowerCase()));
        if (!matchSubj) continue;
      }
      if (topicParam && topicParam !== 'all') {
        const matchTopic =
          topicName.toLowerCase() === topicParam.toLowerCase() ||
          topicName.toLowerCase().includes(topicParam.toLowerCase()) ||
          topicParam.toLowerCase().includes(topicName.toLowerCase());
        if (!matchTopic) continue;
      }
      if (searchParam) {
        const matchText = (q.text || '').toLowerCase().includes(searchParam);
        const matchTopic = topicName.toLowerCase().includes(searchParam);
        const matchSubject = subject.toLowerCase().includes(searchParam);
        if (!matchText && !matchTopic && !matchSubject) continue;
      }

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, new Map<string, any[]>());
      }
      const topicMap = subjectMap.get(subject)!;
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, []);
      }

      const formattedQ = {
        id: q.id,
        sequenceNum: q.sequenceNum,
        text: q.text,
        type: q.type,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        imageUrl: q.imageUrl,
        diagramSvg: q.diagramSvg,
        pageNumber: q.pageNumber,
        options: (Array.isArray(q.options) ? (q.options as any[]) : []).map((opt) => ({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl,
          isCorrect: opt.isCorrect,
          sequenceNum: opt.sequenceNum,
        })),
        topic: {
          id: q.topic?.id,
          name: topicName,
          subject: q.topic?.subject || subject,
        },
        paper: q.paper ? {
          id: q.paper.id,
          title: q.paper.title,
          examType: q.paper.examType,
          year: q.paper.year,
          subject: q.paper.subject,
        } : null,
      };

      topicMap.get(topicName)!.push(formattedQ);
      flatQuestions.push(formattedQ);
    }

    // Transform map to clean structured response
    const groupedSubjects: Array<{
      subject: string;
      questionCount: number;
      topics: Array<{
        name: string;
        questionCount: number;
        questions: any[];
      }>;
    }> = [];

    subjectMap.forEach((topicsMap, subjectName) => {
      let subjectTotalQuestions = 0;
      const topicsList: Array<{ name: string; questionCount: number; questions: any[] }> = [];

      topicsMap.forEach((qList, tName) => {
        subjectTotalQuestions += qList.length;
        topicsList.push({
          name: tName,
          questionCount: qList.length,
          questions: qList,
        });
      });

      // Sort topics by question count descending
      topicsList.sort((a, b) => b.questionCount - a.questionCount);

      groupedSubjects.push({
        subject: subjectName,
        questionCount: subjectTotalQuestions,
        topics: topicsList,
      });
    });

    // Sort subjects by question count descending
    groupedSubjects.sort((a, b) => b.questionCount - a.questionCount);

    return NextResponse.json({
      success: true,
      totalQuestions: flatQuestions.length,
      questions: flatQuestions,
      subjects: groupedSubjects,
    });
  } catch (err: any) {
    console.error('[QuestionsAPI] Error querying questions:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve questions repository' },
      { status: 500 }
    );
  }
}
