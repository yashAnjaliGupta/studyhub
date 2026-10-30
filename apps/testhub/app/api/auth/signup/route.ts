import { NextResponse } from 'next/server';
import { prisma } from '@repo/db/client';
import { hashPassword, verifyOtpAsync, deleteOtp } from '@repo/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, otp } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email format.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'Verification code (OTP) is required.' },
        { status: 400 }
      );
    }

    // Verify OTP against shared store (with Redis persistence)
    const verification = await verifyOtpAsync(normalizedEmail, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    const trimmedName =
      (name && typeof name === 'string' ? name.trim() : '') ||
      normalizedEmail.split('@')[0];

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Hash password and store user in database
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Clean up OTP on success
    deleteOtp(normalizedEmail);

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[TestHub Signup API] Error creating user:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to register account. Please try again.' },
      { status: 500 }
    );
  }
}
