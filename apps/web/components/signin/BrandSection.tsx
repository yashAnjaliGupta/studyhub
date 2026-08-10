import {
    GraduationCap,
    BookOpen,
    Download,
    Bookmark,
} from "lucide-react";

import FeatureCard from "./FeatureCard";

export default function BrandSection() {
    return (
        <section className="flex flex-col justify-between">
            <div>
                <div className="mb-10 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                        <GraduationCap className="h-7 w-7 text-blue-600" />
                    </div>

                    <h1 className="text-3xl font-bold">
                        StudyHub
                    </h1>
                </div>

                <h2 className="text-5xl font-bold tracking-tight">
                    Welcome Back!
                </h2>

                <p className="mt-4 max-w-lg text-lg text-slate-500">
                    Sign in to access your exams, notes,
                    PDFs, bookmarks and personalized study
                    experience.
                </p>
            </div>

            <div className="mt-12 space-y-4">
                <FeatureCard
                    icon={BookOpen}
                    title="Browse organized exams and study material."
                />

                <FeatureCard
                    icon={Download}
                    title="Download PDFs and DOCX for offline study."
                />

                <FeatureCard
                    icon={Bookmark}
                    title="Bookmark resources and continue anytime."
                />
            </div>
        </section>
    );
}