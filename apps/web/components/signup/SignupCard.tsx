"use client";

import { FcGoogle } from "react-icons/fc";
import { useState, type FormEvent } from "react";
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    User,
    KeyRound,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
} from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignupCard() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [step, setStep] = useState<"details" | "otp">("details");
    const [otp, setOtp] = useState("");
    const [agreedTerms, setAgreedTerms] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (errorMsg) setErrorMsg("");
    }

    async function handleSendOtp(e?: FormEvent) {
        if (e) e.preventDefault();
        setErrorMsg("");
        setInfoMsg("");

        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password) {
            setErrorMsg("Please fill in all required fields.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        if (!agreedTerms) {
            setErrorMsg("Please accept the Terms & Conditions to proceed.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/signup/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                setErrorMsg(data.error || "Failed to send OTP. Please try again.");
            } else {
                setStep("otp");
                setInfoMsg(`Verification code sent to ${formData.email}`);
            }
        } catch (err: any) {
            setErrorMsg("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyAndSignup(e: FormEvent) {
        e.preventDefault();
        setErrorMsg("");
        setInfoMsg("");

        if (!otp || otp.length < 4) {
            setErrorMsg("Please enter the complete verification code.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    otp,
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                setErrorMsg(data.error || "Signup failed. Invalid OTP or user exists.");
            } else {
                setInfoMsg("Account created! Signing you in...");
                // Automatically log user in
                await signIn("credentials", {
                    email: formData.email,
                    password: formData.password,
                    callbackUrl: "/",
                });
            }
        } catch (err: any) {
            setErrorMsg("An unexpected error occurred during signup.");
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (step === "details") {
            handleSendOtp();
        } else {
            handleVerifyAndSignup(e);
        }
    }

    return (
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-10">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-slate-900">
                        {step === "details" ? "Create Account" : "Verify Email"}
                    </h1>
                    {step === "otp" && (
                        <button
                            type="button"
                            onClick={() => {
                                setStep("details");
                                setErrorMsg("");
                                setInfoMsg("");
                            }}
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                        >
                            <ArrowLeft className="h-4 w-4" /> Edit details
                        </button>
                    )}
                </div>

                <p className="mt-2 text-slate-500">
                    {step === "details"
                        ? "Start your learning journey with StudyHub."
                        : `We sent a 6-digit verification code to ${formData.email}`}
                </p>
            </div>

            {/* Error & Info Banners */}
            {errorMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-600 border border-red-200">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {infoMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm font-medium text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{infoMsg}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {step === "details" ? (
                    <>
                        {/* Name */}
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    First Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        required
                                        placeholder="John"
                                        className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        name="firstName"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        required
                                        placeholder="Doe"
                                        className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        name="lastName"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    type="email"
                                    placeholder="john@example.com"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    value={formData.email}
                                    onChange={handleChange}
                                    name="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    value={formData.password}
                                    onChange={handleChange}
                                    name="password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-12 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    name="confirmPassword"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirm ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreedTerms}
                                onChange={(e) => setAgreedTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                I agree to the{" "}
                                <a
                                    href="/terms"
                                    className="font-medium text-blue-600 hover:underline"
                                >
                                    Terms & Conditions
                                </a>{" "}
                                and{" "}
                                <a
                                    href="/privacy"
                                    className="font-medium text-blue-600 hover:underline"
                                >
                                    Privacy Policy
                                </a>
                                .
                            </span>
                        </label>
                    </>
                ) : (
                    /* OTP Input Step */
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Enter 6-Digit Verification Code
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    className="w-full rounded-xl border border-slate-300 py-3.5 pl-11 pr-4 text-lg font-mono tracking-widest outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.trim())}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Didn't receive code?</span>
                            <button
                                type="button"
                                onClick={() => handleSendOtp()}
                                disabled={loading}
                                className="font-semibold text-blue-600 hover:underline disabled:opacity-50"
                            >
                                Resend OTP
                            </button>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-blue-600
                        py-3.5
                        font-semibold
                        text-white
                        transition
                        hover:bg-blue-700
                        hover:shadow-lg
                        disabled:opacity-60
                        disabled:cursor-not-allowed
                    "
                    type="submit"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : step === "details" ? (
                        "Create Account"
                    ) : (
                        "Verify OTP & Complete Signup"
                    )}
                </button>
            </form>

            {/* Divider & Social Buttons (only on details step) */}
            {step === "details" && (
                <>
                    <div className="my-8 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs uppercase tracking-widest text-slate-400">
                            OR CONTINUE WITH
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-1">
                        <button
                            type="button"
                            onClick={() => signIn("google", { callbackUrl: "/" })}
                            className="rounded-xl border border-slate-300 py-3 font-medium transition hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                            <FcGoogle size={24} /> Continue with Google
                        </button>
                    </div>
                </>
            )}

            {/* Footer */}
            <p className="mt-8 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <a
                    href="/signin"
                    className="font-semibold text-blue-600 hover:underline"
                >
                    Sign In
                </a>
            </p>
        </div>
    );
}