import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ShieldCheck, UserCheck, AlertTriangle, FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | StudyHub",
  description: "Terms of Service and conditions for using StudyHub smart learning platform.",
};

export default function TermsPage() {
  const lastUpdated = "August 7, 2026";

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 md:p-12 text-white shadow-xl mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              Legal Agreement
            </span>
            <span className="text-xs text-blue-200">Last updated: {lastUpdated}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl">
            Please read these terms carefully before using the StudyHub platform. By accessing or using our services, you agree to be bound by these terms.
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200/80 text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section id="acceptance" className="space-y-3">
            <div className="flex items-center gap-3 text-blue-700">
              <FileText className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            </div>
            <p>
              By creating an account, logging in, or accessing any part of StudyHub (&quot;the Platform&quot;), you acknowledge that you have read, understood, and agreed to these Terms of Service. If you do not agree with any portion of these terms, you must discontinue use of the Platform immediately.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section id="services" className="space-y-3">
            <div className="flex items-center gap-3 text-blue-700">
              <ShieldCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">2. Platform Services & Access</h2>
            </div>
            <p>
              StudyHub provides digital educational resources, interactive study materials, practice questions, PDF study viewers, and AI-assisted learning tools for students preparing for competitive examinations (including CBSE, NCERT, and related boards).
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
              <li>Services are provided for personal, non-commercial educational use only.</li>
              <li>We reserve the right to modify, suspend, or discontinue any feature or content at any time without prior notice.</li>
              <li>AI chatbot responses are designed as learning aids and should be cross-referenced with primary textbook materials.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3 */}
          <section id="accounts" className="space-y-3">
            <div className="flex items-center gap-3 text-blue-700">
              <UserCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">3. User Accounts & Registration</h2>
            </div>
            <p>
              To access personalized study features and tracking, you may register using an email account or third-party authentication (such as Google Sign-In).
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-blue-600">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to provide accurate and truthful information during registration.</li>
              <li>You are responsible for all activities conducted under your account.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4 */}
          <section id="acceptable-use" className="space-y-3">
            <div className="flex items-center gap-3 text-blue-700">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">4. Prohibited Conduct</h2>
            </div>
            <p>When using StudyHub, you explicitly agree NOT to:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-sm">
                <strong className="text-red-900 block mb-1">Scraping & Bulk Downloading</strong>
                Attempt to systematically download, extract, or scrape content, PDFs, or dataset endpoints.
              </div>
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-sm">
                <strong className="text-red-900 block mb-1">Unauthorized Access</strong>
                Bypass security controls, attempt server intrusions, or probe system vulnerabilities.
              </div>
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-sm">
                <strong className="text-red-900 block mb-1">Platform Abuse</strong>
                Use automated bots or scripts to spam AI endpoints or disrupt service availability for other users.
              </div>
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-sm">
                <strong className="text-red-900 block mb-1">Intellectual Property Theft</strong>
                Redistribute, re-sell, or sublicense StudyHub materials without express permission.
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 5 */}
          <section id="disclaimer" className="space-y-3">
            <div className="flex items-center gap-3 text-blue-700">
              <Scale className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">5. Disclaimer & Limitation of Liability</h2>
            </div>
            <p>
              StudyHub materials are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we strive for accuracy in study materials and AI summaries, we make no guarantees regarding complete error-free content or specific examination outcomes.
            </p>
            <p>
              In no event shall StudyHub or its creators be liable for indirect, incidental, or consequential damages resulting from your use of the platform.
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 6 */}
          <section id="contact" className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">6. Contact & Inquiries</h2>
            <p>
              If you have any questions or concerns regarding these Terms of Service, please reach out to us at:
            </p>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 font-medium inline-block">
              Email: support@yashguptaiiit.in
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
