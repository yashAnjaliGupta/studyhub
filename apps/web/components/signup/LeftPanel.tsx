import Link from "next/link";
import {
    GraduationCap,
    BookOpen,
    Sparkles,
    FileCheck2,
    DownloadCloud,
} from "lucide-react";

import FeatureItem from "./FeatureItem";

export default function LeftPanel() {
    return (
        <section
            className="
        relative
        hidden
        lg:flex
        flex-col
        justify-between
        overflow-hidden
        bg-gradient-to-br
        from-blue-700
        via-blue-800
        to-slate-950
        p-12
        text-white
      "
        >
            {/* Decorative Blur Orbs */}
            <div className="absolute left-16 top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
            <div className="absolute right-12 bottom-20 h-64 w-64 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />

            {/* Logo */}
            <div className="relative z-10">
                <Link href="/" className="inline-flex items-center gap-4 transition hover:opacity-90">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">StudyHub</h2>
                        <p className="text-xs text-blue-200">Smart Exam Preparation</p>
                    </div>
                </Link>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 max-w-xl my-auto py-10">
                <span className="inline-block rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-100 backdrop-blur-md mb-4">
                    100% Free For Students
                </span>

                <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
                    Start Learning <br />
                    <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                        Smarter with AI
                    </span>
                </h1>

                <p className="mt-5 text-base xl:text-lg leading-relaxed text-blue-100/90">
                    Create your free account to access verified CBSE and JEE question papers,
                    authentic NCERT books, and an intelligent in-PDF study tutor.
                </p>

                <div className="mt-10 space-y-4">
                    <FeatureItem
                        icon={BookOpen}
                        title="Comprehensive CBSE & JEE curriculum with chapter breakdowns."
                    />
                    <FeatureItem
                        icon={FileCheck2}
                        title="Official previous year question papers (PYQs) with answer keys."
                    />
                    <FeatureItem
                        icon={Sparkles}
                        title="In-PDF AI assistant to summarize, explain, and clarify concepts."
                    />
                    <FeatureItem
                        icon={DownloadCloud}
                        title="Fast offline PDF downloads for studying anywhere."
                    />
                </div>
            </div>

            {/* Bottom Proof Quote */}
            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs italic text-blue-100">
                    &quot;StudyHub makes preparing for board and competitive exams simple, organized, and focused.&quot;
                </p>
                <p className="mt-2 text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                    — The StudyHub Team
                </p>
            </div>
        </section>
    );
}