import { PrismaClient } from "@repo/db/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { otpStore } from "../../../lib/otpStore";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { firstName, lastName, email, password, otp } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
        }

        if (!otp) {
            return NextResponse.json({ error: "OTP is required." }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const storedOtp = otpStore.get(normalizedEmail);

        if (!storedOtp || storedOtp !== otp.trim()) {
            return NextResponse.json({ error: "Invalid or expired OTP. Please try again." }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
        }

        const name = `${firstName || ""} ${lastName || ""}`.trim();
        const hashedPassword = bcrypt.hashSync(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
            },
        });

        // Remove OTP after successful signup
        otpStore.delete(normalizedEmail);

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}