import { LucideIcon } from "lucide-react";

interface FeatureItemProps {
    icon: LucideIcon;
    title: string;
}

export default function FeatureItem({
    icon: Icon,
    title,
}: FeatureItemProps) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/15">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-5 w-5 text-white" />
            </div>

            <p className="text-sm leading-6 text-blue-100">
                {title}
            </p>
        </div>
    );
}