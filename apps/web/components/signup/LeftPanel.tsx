import {
    GraduationCap,
    Star,
    Users,
    TrendingUp,
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
        to-blue-950
        p-12
        text-white
      "
        >
            {/* Decorative Blur */}

            <div className="absolute left-16 top-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="absolute right-12 bottom-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />

            {/* Logo */}

            <div className="relative z-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                    <GraduationCap className="h-7 w-7" />
                </div>

                <h2 className="text-3xl font-bold">
                    StudyHub
                </h2>
            </div>

            {/* Hero */}

            <div className="relative z-10 max-w-xl">
                <h1 className="text-5xl font-bold leading-tight">
                    Join
                    <br />
                    StudyHub
                </h1>

                <p className="mt-6 text-lg leading-8 text-blue-100">
                    Create your free account and start learning
                    with thousands of books, notes, previous year
                    papers and AI powered study tools.
                </p>

                <div className="mt-12 space-y-5">
                    <FeatureItem
                        icon={Star}
                        title="Access thousands of exam resources."
                    />

                    <FeatureItem
                        icon={Users}
                        title="Join a growing community of learners."
                    />

                    <FeatureItem
                        icon={TrendingUp}
                        title="Track your progress and performance."
                    />
                </div>
            </div>

            {/* Decorative Illustration */}

            <div className="relative z-10 mt-10 h-56 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-400/10 to-transparent">
                {/* Background circles */}

                <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />

                <div className="absolute right-10 top-12 h-20 w-20 rotate-12 rounded-xl bg-white/10" />

                <div className="absolute bottom-10 right-20 h-16 w-16 rounded-full bg-cyan-300/20" />

                {/* Grid */}

                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_40%,rgba(255,255,255,.08)_40%,rgba(255,255,255,.08)_45%,transparent_45%,transparent_65%,rgba(255,255,255,.08)_65%,rgba(255,255,255,.08)_70%,transparent_70%)]" />
            </div>
        </section>
    );
}