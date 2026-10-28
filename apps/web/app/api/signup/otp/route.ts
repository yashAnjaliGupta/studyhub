import { NextResponse } from "next/server";
import { prisma } from "@repo/db/client";
import { sendOtpEmail } from "@repo/auth/otp";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists. Please sign in.",
        },
        { status: 409 }
      );
    }

    const result = await sendOtpEmail({
      email: normalizedEmail,
      appName: "StudyHub",
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[StudyHub OTP] Error sending verification email:", e);
    return NextResponse.json(
      {
        success: false,
        error: e?.message || "Failed to send OTP verification email. Please try again.",
      },
      { status: 500 }
    );
  }
}
