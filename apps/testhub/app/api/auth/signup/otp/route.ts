import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';
import { sendOtpEmail } from '@repo/auth/otp';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email format.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    // Send OTP via Resend
    const result = await sendOtpEmail({
      email: normalizedEmail,
      appName: 'TestHub',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[TestHub OTP] Error sending verification code:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to send OTP verification email. Please try again.',
      },
      { status: 500 }
    );
  }
}

