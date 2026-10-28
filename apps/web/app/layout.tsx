import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { TelemetryProvider } from "../lib/telemetry";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://studyhub.yashguptaiiit.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "StudyHub | AI-Powered Exam Preparation & NCERT Learning Platform",
    template: "%s | StudyHub",
  },
  description:
    "Free NCERT textbooks, chapter summaries, authentic CBSE & JEE previous year question papers (PYQs), and AI-driven study assistance.",
  keywords: [
    "NCERT Solutions",
    "CBSE Class 10 Previous Year Papers",
    "CBSE Class 12 PYQ PDF",
    "JEE Main Question Papers",
    "JEE Advanced PYQs",
    "StudyHub AI learning",
    "Free NCERT Books PDF",
  ],
  authors: [{ name: "StudyHub Team" }],
  creator: "StudyHub",
  publisher: "StudyHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    title: "StudyHub | AI-Powered Exam Preparation & NCERT Learning Platform",
    description:
      "Access NCERT textbooks, chapter summaries, and authentic previous year question papers for CBSE & JEE preparation with AI tutoring.",
    siteName: "StudyHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyHub | AI-Powered Exam Preparation & NCERT Learning Platform",
    description:
      "Access NCERT textbooks, chapter summaries, and authentic previous year question papers for CBSE & JEE preparation.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Navbar />
        <TelemetryProvider>
          {children}
        </TelemetryProvider>
        <Footer />
      </body>
    </html>
  );
}
