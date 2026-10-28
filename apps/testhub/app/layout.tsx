import './globals.css';
import 'katex/dist/katex.min.css';
import type { Metadata } from 'next';
import { TestHubLayout } from '../components/testhub-layout';
import { AuthProvider } from '../components/auth-provider';

const siteUrl =
  process.env.NEXT_PUBLIC_TESTHUB_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://testhub.studyhub.yashguptaiiit.in';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'TestHub | Authentic CBT Mock Test & PYQ Practice Engine',
    template: '%s | TestHub',
  },
  description:
    'Experience official Computer Based Test (CBT) simulations for JEE Main, JEE Advanced, NEET-UG, and CBSE board examination papers with step-by-step marking and AI guidance.',
  keywords: [
    'JEE Main CBT Mock Test',
    'JEE Advanced Practice Paper',
    'NEET Online Test Series',
    'CBSE Board Question Bank',
    'Computer Based Test Simulation',
    'NTA Mock Test Free',
    'TestHub exam prep',
  ],
  authors: [{ name: 'TestHub by StudyHub' }],
  creator: 'TestHub',
  publisher: 'TestHub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    title: 'TestHub | Authentic CBT Mock Test & PYQ Practice Engine',
    description:
      'Official CBT format examination environment with real-time timer, palette navigation, numerical value inputs, and AI performance analysis.',
    siteName: 'TestHub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TestHub | Authentic CBT Mock Test & PYQ Practice Engine',
    description:
      'Practice authentic JEE, NEET & CBSE papers under real exam conditions with timer and AI guidance.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="font-sans">
      <body>
        <AuthProvider>
          <TestHubLayout>{children}</TestHubLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
