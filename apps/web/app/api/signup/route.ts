import { prisma } from "@repo/db/client";
import { hashPassword, verifyOtpAsync, deleteOtp } from "@repo/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password, otp } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { error: "Verification code (OTP) is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify OTP using shared store (with Redis persistence)
    const verification = await verifyOtpAsync(normalizedEmail, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const name = `${firstName || ""} ${lastName || ""}`.trim() || normalizedEmail.split("@")[0];
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Clean up OTP after successful registration
    deleteOtp(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: "Account created successfully.",
      user,
    });
  } catch (error: any) {
    console.error("[StudyHub Signup] Error creating user:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
