'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TestHubLoader } from '../../components/testhub-loader';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/papers';

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-[calc(100vh-68px)] items-center justify-center">
        <TestHubLoader size={36} text={status === 'authenticated' ? 'Redirecting...' : 'Loading...'} />
      </div>
    );
  }

  const handleSendOtp = async (isResend = false) => {
    setError(null);
    setInfoMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your full name');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email format');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isResend) {
      setIsResending(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetch('/api/auth/signup/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send verification code. Please try again.');
        return;
      }

      setStep('otp');
      if (data.devOtp) {
        setOtp(data.devOtp);
        setInfoMessage(`Verification code sent! (Dev mode auto-fill: ${data.devOtp})`);
      } else {
        setInfoMessage(`Verification code sent to ${trimmedEmail}`);
      }
    } catch {
      setError('Network error. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      setIsResending(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create account. Invalid or expired OTP.');
        setIsLoading(false);
        return;
      }

      setInfoMessage('Account verified successfully! Signing you in...');

      // Auto sign-in after successful registration
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (signInRes?.error) {
        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred during verification. Please try again.');
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'details') {
      handleSendOtp(false);
    } else {
      handleVerifyAndSignup(e);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  return (
    <div className="relative min-h-[calc(100vh-68px)] bg-slate-50">
      <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl lg:grid-cols-2">
        {/* Left Branding Panel */}
        <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0c2340] via-[#103b70] to-[#0875f9] p-12 text-white">
          <div className="absolute -top-24 -left-24 size-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 size-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/15 text-xl font-black text-white shadow-lg ring-1 ring-white/25 backdrop-blur">
                T
              </span>
              <div>
                <span className="block text-2xl font-bold leading-tight tracking-tight">TestHub</span>
                <span className="block text-xs text-blue-200">Authentic CBT Assessment</span>
              </div>
            </Link>
          </div>

          {/* Main Hero */}
          <div className="relative z-10 max-w-lg my-auto py-8">
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100 backdrop-blur-md mb-4">
              Candidate Registration
            </span>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Master Exam Day <br />
              <span className="bg-gradient-to-r from-cyan-200 via-blue-100 to-white bg-clip-text text-transparent">
                With Realistic CBT Practice
              </span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-blue-100/90">
              Create your verified candidate account to access authentic past exam papers, live
              time-bounded tests, and comprehensive scorecard breakdowns.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-xs font-bold text-cyan-200">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Authentic CBT Exam Interface</h4>
                  <p className="text-xs text-blue-100/80">Experience real NTA color-coded question palettes and countdown timers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-xs font-bold text-cyan-200">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Verified Candidate Scorecards</h4>
                  <p className="text-xs text-blue-100/80">Secure OTP-verified account keeps your performance history and analytics intact.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/10">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-xs font-bold text-cyan-200">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Full StudyHub Integration</h4>
                  <p className="text-xs text-blue-100/80">Cross-reference questions with textbook chapters and AI study explanations.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer quote */}
          <div className="relative z-10 text-xs text-blue-200/90 border-t border-white/10 pt-4">
            Free and distraction-free for students preparing for JEE, NEET, and CBSE boards.
          </div>
        </section>

        {/* Right Form Section */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8 md:px-12 lg:px-14">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-7 sm:p-9 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#102a56]">
                  {step === 'details' ? 'Create Candidate Account' : 'Verify Your Email'}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#68778b]">
                  {step === 'details'
                    ? 'Sign up to save scorecards and practice full-length papers'
                    : `We've sent a 6-digit verification code to ${email}`}
                </p>
              </div>
              {step === 'otp' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs font-semibold text-[#0875f9] hover:underline flex items-center gap-1 mt-1 shrink-0"
                >
                  ← Edit details
                </button>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 font-medium flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-800 font-medium flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{infoMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleFormSubmit}>
              {step === 'details' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#68778b]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#68778b]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="candidate@example.com"
                      className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  {/* Password with View Toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#68778b]">
                      Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="At least 6 characters"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password with View Toggle */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#68778b]">
                      Confirm Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Re-type your password"
                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-[#1c2d45] placeholder-slate-400 focus:border-[#0875f9] focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? (
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* OTP Verification Section */
                <div className="space-y-4 py-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0875f9] block mb-1">
                      One-Time Password (OTP)
                    </span>
                    <p className="text-xs text-[#526484] mb-3">
                      Please check your inbox or spam folder for the code.
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.trim());
                        if (error) setError(null);
                      }}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.3em] font-mono text-2xl font-bold py-3 px-4 rounded-xl border border-slate-300 bg-white text-[#102a56] shadow-sm focus:border-[#0875f9] focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#68778b] pt-1">
                    <span>Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      disabled={isResending || isLoading}
                      onClick={() => handleSendOtp(true)}
                      className="font-bold text-[#0875f9] hover:underline disabled:opacity-50"
                    >
                      {isResending ? 'Sending code...' : 'Resend Code'}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-[#0875f9] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{step === 'details' ? 'Sending Verification Code...' : 'Verifying & Registering...'}</span>
                  </>
                ) : step === 'details' ? (
                  'Continue & Send Code'
                ) : (
                  'Verify Code & Complete Registration'
                )}
              </button>
            </form>

            {step === 'details' && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-[#68778b]">or sign up with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1c2d45] shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Google
                </button>
              </>
            )}

            <div className="pt-2 text-center text-xs text-[#68778b]">
              Already have an account?{' '}
              <Link
                href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-bold text-[#0875f9] hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center">
          <TestHubLoader size={36} text="Loading sign-up..." />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
