import { Resend } from "resend";
import { NextResponse } from "next/server";
import { otpStore } from "../../../../lib/otpStore";
import { generateOtpEmailHtml } from "../../../../lib/emailTemplates";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const apiKey = process.env.RESEND_API_KEY;
        const resend = new Resend(apiKey || "re_dummy");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in shared memory store
        otpStore.set(normalizedEmail, otp);
        console.log(`[OTP GENERATED] ${normalizedEmail} -> ${otp}`);

        if (apiKey) {
            await resend.emails.send({
                from: "support@yashguptaiiit.in",
                to: normalizedEmail,
                subject: "Welcome to StudyHub - Verify Your Email",
                html: generateOtpEmailHtml({ otp, email: normalizedEmail })
            });
        }

        return NextResponse.json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (e: any) {
        console.error("Error sending OTP:", e);
        return NextResponse.json({
            success: false,
            error: e?.message || "Failed to send OTP email"
        }, { status: 500 });
    }
}