"use client";

import { Eye } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        signIn("credentials", {
            email,
            password,
            callbackUrl: "/"
        });
    };
    return (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label className="mb-2 block text-sm font-medium">
                    Email
                </label>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                    Password
                </label>

                <div className="relative">
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border p-3 pr-10 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />

                    <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <Eye className="h-4 w-4 text-slate-400" />
                    </button>
                </div>

                <div className="mt-2 text-right">
                    <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
            </div>

            <button type="submit" className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700">
                Sign In
            </button>
        </form>
    );
}