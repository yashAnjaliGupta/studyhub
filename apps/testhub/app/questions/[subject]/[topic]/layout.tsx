import type { Metadata } from 'next';

type Props = {
  params: Promise<{
    subject: string;
    topic: string;
  }>;
  children: React.ReactNode;
};

const siteUrl =
  process.env.NEXT_PUBLIC_TESTHUB_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://testhub.studyhub.yashguptaiiit.in';

export async function generateMetadata({ params }: { params: Promise<{ subject: string; topic: string }> }): Promise<Metadata> {
  const { subject: rawSubject, topic: rawTopic } = await params;
  const subject = decodeURIComponent(rawSubject);
  const topic = decodeURIComponent(rawTopic);

  const title = `${topic} Questions & Solutions (${subject}) | TestHub`;
  const description = `Practice ${topic} multiple-choice and numerical questions for ${subject}. Free chapter-wise problem sets with step-by-step solutions and KaTeX mathematical notation.`;
  const canonicalUrl = `${siteUrl}/questions/${rawSubject}/${rawTopic}`;

  return {
    title,
    description,
    keywords: [
      `${topic} questions`,
      `${subject} ${topic} practice`,
      `${topic} MCQs with solution`,
      `${subject} PYQ topic wise`,
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

export default async function TopicQuestionsLayout({ params, children }: Props) {
  const { subject: rawSubject, topic: rawTopic } = await params;
  const subject = decodeURIComponent(rawSubject);
  const topic = decodeURIComponent(rawTopic);

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
        name: 'Questions',
        item: `${siteUrl}/questions`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: subject,
        item: `${siteUrl}/questions`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: topic,
        item: `${siteUrl}/questions/${rawSubject}/${rawTopic}`,
      },
    ],
  };

  const itemGroupJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${topic} Practice Questions (${subject})`,
    description: `Curated practice questions and step-by-step solutions for ${topic} in ${subject}.`,
    url: `${siteUrl}/questions/${rawSubject}/${rawTopic}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemGroupJsonLd) }}
      />
      {children}
    </>
  );
}

