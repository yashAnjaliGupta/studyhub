import type { Metadata } from 'next';
import { client } from '@repo/db/client';
import { getMockPaper } from '../../../lib/mock-data';

type Props = {
  params: Promise<{
    id: string;
  }>;
  children: React.ReactNode;
};

const siteUrl =
  process.env.NEXT_PUBLIC_TESTHUB_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://testhub.studyhub.yashguptaiiit.in';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  let title = 'CBT Practice Paper | TestHub';
  let description = 'Practice this authentic examination paper in the official CBT simulation interface.';
  let examType = 'Exam';
  let year = new Date().getFullYear();

  try {
    const dbPaper = await client.paper.findUnique({
      where: { id },
      select: {
        title: true,
        subject: true,
        examType: true,
        year: true,
        durationMin: true,
        totalMarks: true,
      },
    });

    if (dbPaper) {
      title = `${dbPaper.title} (${dbPaper.examType} ${dbPaper.year}) CBT Mock Test | TestHub`;
      description = `Practice ${dbPaper.title} (${dbPaper.subject}) in real NTA CBT exam simulation. Features authentic countdown timer, ${dbPaper.totalMarks} marks, and detailed AI solutions.`;
      examType = dbPaper.examType;
      year = dbPaper.year;
    } else {
      const mock = getMockPaper(id);
      title = `${mock.title} CBT Mock Test | TestHub`;
      description = `Practice ${mock.title} (${mock.subject}) in full CBT format with timer and solutions on TestHub.`;
      examType = mock.examType;
      year = mock.year;
    }
  } catch {
    const mock = getMockPaper(id);
    title = `${mock.title} CBT Mock Test | TestHub`;
    description = `Practice ${mock.title} in full CBT format on TestHub.`;
  }

  const canonicalUrl = `${siteUrl}/papers/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    keywords: [
      `${examType} ${year} question paper`,
      `${examType} CBT mock test`,
      'online exam practice',
      'TestHub paper',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TestHub',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PaperDetailLayout({ params, children }: Props) {
  const { id } = await params;
  let paperName = 'Practice Exam Paper';
  let examType = 'General';

  try {
    const dbPaper = await client.paper.findUnique({
      where: { id },
      select: { title: true, examType: true },
    });
    if (dbPaper) {
      paperName = dbPaper.title;
      examType = dbPaper.examType;
    } else {
      const mock = getMockPaper(id);
      paperName = mock.title;
      examType = mock.examType;
    }
  } catch {
    const mock = getMockPaper(id);
    paperName = mock.title;
    examType = mock.examType;
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Papers',
        item: `${siteUrl}/papers`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: paperName,
        item: `${siteUrl}/papers/${encodeURIComponent(id)}`,
      },
    ],
  };

  const quizJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: paperName,
    educationalAlignment: [
      {
        '@type': 'AlignmentObject',
        alignmentType: 'educationalLevel',
        targetName: examType,
      },
    ],
    url: `${siteUrl}/papers/${encodeURIComponent(id)}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizJsonLd) }}
      />
      {children}
    </>
  );
}

