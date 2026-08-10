'use client';
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export default function SocialLogin() {
    return (
        <>
            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs uppercase tracking-widest text-slate-500">
                    or continue with
                </span>

                <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="rounded-lg border py-3 transition hover:bg-slate-50">
                    <FcGoogle className="inline-block mr-2" size={25} /> Google
                </button>
            </div>
        </>
    );
}