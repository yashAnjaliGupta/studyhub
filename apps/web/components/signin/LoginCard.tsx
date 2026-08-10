import LoginForm from "./LoginForm";
import SocialLogin from "./SocialLogin";

export default function LoginCard() {
    return (
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-2xl">
            <h2 className="text-3xl font-bold">
                Sign In
            </h2>

            <p className="mt-2 text-sm text-slate-500">
                Don't have an account?{" "}
                <a
                    href="/signup"
                    className="font-medium text-blue-600"
                >
                    Sign Up
                </a>
            </p>

            <div className="mt-8">
                <LoginForm />
            </div>

            <SocialLogin />

            <p className="mt-8 text-center text-xs text-slate-500">
                © 2026 StudyHub
            </p>
        </div>
    );
}