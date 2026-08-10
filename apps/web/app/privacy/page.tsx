import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, Database, Server, UserCheck, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | StudyHub",
  description: "Privacy Policy explaining how StudyHub collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
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
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-800 p-8 md:p-12 text-white shadow-xl mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
              Data Protection & Privacy
            </span>
            <span className="text-xs text-teal-100">Last updated: {lastUpdated}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-4 text-lg text-teal-50 max-w-2xl">
            At StudyHub, we respect your privacy and are committed to protecting your personal information. This policy explains our data practices clearly and transparently.
          </p>
        </div>

        {/* Document Content */}
        <div className="space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200/80 text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section id="collection" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <Database className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            </div>
            <p>
              To provide you with personalized learning resources and track your academic progress, we collect minimal necessary data:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100/80 text-sm">
                <strong className="text-teal-900 block mb-1">Account Credentials</strong>
                Name, email address, profile avatar (when authenticating via Google or Credentials). Password hashes are securely stored using bcrypt.
              </div>
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100/80 text-sm">
                <strong className="text-teal-900 block mb-1">Study Activity & Interaction</strong>
                Chapters accessed, search queries, book/subject selections, and AI chat interactions for contextual learning.
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2 */}
          <section id="usage" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <Eye className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
            </div>
            <p>We use the collected information strictly for legitimate educational and platform operational purposes:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-600">
              <li>Authenticating users and providing access to study materials and PDF viewers.</li>
              <li>Powering AI study assistants to generate relevant chapter summaries and answer questions.</li>
              <li>Improving website performance, navigation, search capabilities, and user experience.</li>
              <li>Sending essential account notifications and service announcements.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3 */}
          <section id="security" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <Lock className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">3. Data Security & Storage</h2>
            </div>
            <p>
              We implement industry-standard technical measures to safeguard your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-600">
              <li>All network communication is encrypted over HTTPS using SSL/TLS protocols.</li>
              <li>Document storage uses secure AWS S3 buckets with presigned, time-bound access URLs.</li>
              <li>Authentication tokens and session states are managed using NextAuth standard security practices.</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 4 */}
          <section id="sharing" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <Server className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">4. Information Sharing & Third Parties</h2>
            </div>
            <p className="font-semibold text-slate-900">
              We DO NOT sell, rent, or trade your personal data to advertisers or third parties under any circumstances.
            </p>
            <p>Data is shared only with trusted infrastructure providers required to deliver the service:</p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-600">
              <li><strong>Google OAuth</strong>: For optional social authentication if selected by the user.</li>
              <li><strong>AWS Bedrock / LLM APIs</strong>: For processing AI study assistant prompts (prompts are processed anonymously without selling personal data).</li>
            </ul>
          </section>

          <hr className="border-slate-100" />

          {/* Section 5 */}
          <section id="rights" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <UserCheck className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">5. Your Data Rights</h2>
            </div>
            <p>You have the right to access, update, or request deletion of your personal data stored on StudyHub.</p>
            <p>
              To request account deletion or data retrieval, please contact us at{' '}
              <a href="mailto:privacy@studyhub.yashguptaiiit.in" className="text-teal-700 font-semibold underline">
                privacy@studyhub.yashguptaiiit.in
              </a>
              .
            </p>
          </section>

          <hr className="border-slate-100" />

          {/* Section 6 */}
          <section id="contact" className="space-y-3">
            <div className="flex items-center gap-3 text-teal-700">
              <Shield className="h-6 w-6" />
              <h2 className="text-xl font-bold text-slate-900">6. Privacy Questions</h2>
            </div>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data privacy practices, please contact our Data Protection team at:
            </p>
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 text-teal-900 font-medium inline-block">
              Email: support@yashguptaiiit.in
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
