import type { Metadata } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_TESTHUB_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://testhub.studyhub.yashguptaiiit.in';

export const metadata: Metadata = {
  title: 'Topic-wise Question Bank & Practice Problems | TestHub',
  description:
    'Explore chapter and topic-wise practice questions for Physics, Chemistry, Mathematics, and Biology with high-resolution vector diagrams and step-by-step solutions.',
  keywords: [
    'JEE Question Bank',
    'NEET Practice Questions',
    'Topic-wise PYQs',
    'Physics MCQ with solutions',
    'Chemistry practice problems',
    'Mathematics calculus questions',
  ],
  alternates: {
    canonical: `${siteUrl}/questions`,
  },
  openGraph: {
    title: 'Topic-wise Question Bank & Practice Problems | TestHub',
    description:
      'Practice topic-wise questions for JEE, NEET and CBSE with vector diagrams, mathematical formulas, and step-by-step solutions.',
    url: `${siteUrl}/questions`,
    siteName: 'TestHub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Topic-wise Question Bank & Practice Problems | TestHub',
    description:
      'Practice topic-wise questions for JEE, NEET and CBSE with instant solutions.',
  },
};

export default function QuestionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'TestHub Practice Questions Bank',
    description: 'Comprehensive repository of topic-wise practice questions with solutions.',
    url: `${siteUrl}/questions`,
  };

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
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      {children}
    </>
  );
}

