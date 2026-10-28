import type { Metadata } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_TESTHUB_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://testhub.studyhub.yashguptaiiit.in';

export const metadata: Metadata = {
  title: 'Previous Year Question Papers & Mock Tests Library | TestHub',
  description:
    'Browse and practice authentic previous year question papers for JEE Main, JEE Advanced, NEET-UG, and CBSE Class 10 & 12 in official NTA CBT exam format.',
  keywords: [
    'JEE Main Previous Year Question Papers',
    'JEE Advanced PYQs CBT',
    'NEET Mock Test Papers',
    'CBSE Class 10 Previous Papers',
    'CBSE Class 12 Question Papers',
    'Online CBT Exam Practice',
  ],
  alternates: {
    canonical: `${siteUrl}/papers`,
  },
  openGraph: {
    title: 'Previous Year Question Papers & Mock Tests Library | TestHub',
    description:
      'Browse authentic previous year question papers for JEE Main, JEE Advanced, NEET, and CBSE in full CBT simulation format.',
    url: `${siteUrl}/papers`,
    siteName: 'TestHub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Previous Year Question Papers & Mock Tests Library | TestHub',
    description:
      'Practice authentic JEE, NEET & CBSE papers under real exam conditions with timer and AI guidance.',
  },
};

export default function PapersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'TestHub Question Papers Library',
    description:
      'Comprehensive library of authentic previous year exam papers and CBT practice mock tests.',
    url: `${siteUrl}/papers`,
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
        name: 'Papers',
        item: `${siteUrl}/papers`,
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

