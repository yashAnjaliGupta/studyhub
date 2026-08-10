import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
}

export default function FeatureCard({
    icon: Icon,
    title,
}: FeatureCardProps) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
            </div>

            <p className="text-sm text-slate-700">
                {title}
            </p>
        </div>
    );
}