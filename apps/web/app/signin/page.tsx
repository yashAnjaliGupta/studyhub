import BackgroundDecoration from "../../components/signin/BackgroundDecoration";
import BrandSection from "../../components/signin/BrandSection";
import LoginCard from "../../components/signin/LoginCard";

export default function LoginPage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50">
            <BackgroundDecoration />

            <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-16 px-6 py-10 lg:grid-cols-2">
                <BrandSection />

                <div className="flex justify-center lg:justify-end">
                    <LoginCard />
                </div>
            </div>
        </main>
    );
}