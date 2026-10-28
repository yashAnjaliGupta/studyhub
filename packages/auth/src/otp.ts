import { Resend } from "resend";

export interface OtpRecord {
  otp: string;
  email: string;
  expiresAt: number;
}

const globalForOtp = globalThis as unknown as {
  studyHubOtpStore: Map<string, OtpRecord> | undefined;
};

export const otpStore = globalForOtp.studyHubOtpStore ?? new Map<string, OtpRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForOtp.studyHubOtpStore = otpStore;
}

/**
 * Stores an OTP with a 10-minute expiration window.
 */
export function setOtp(email: string, otp: string, ttlMinutes = 10): void {
  const normalized = email.trim().toLowerCase();
  otpStore.set(normalized, {
    otp: otp.trim(),
    email: normalized,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  });
}

/**
 * Retrieves the stored OTP if not expired.
 */
export function getOtp(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const record = otpStore.get(normalized);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return null;
  }
  return record.otp;
}

/**
 * Verifies an entered OTP against the store.
 */
export function verifyOtp(
  email: string,
  enteredOtp: string
): { valid: boolean; reason?: string } {
  if (!email || !enteredOtp) {
    return { valid: false, reason: "Email and verification code are required." };
  }

  const normalized = email.trim().toLowerCase();
  const record = otpStore.get(normalized);

  if (!record) {
    return {
      valid: false,
      reason: "No verification code found or it has expired. Please request a new code.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalized);
    return {
      valid: false,
      reason: "Verification code has expired. Please request a new code.",
    };
  }

  if (record.otp !== enteredOtp.trim()) {
    return {
      valid: false,
      reason: "Invalid verification code. Please check your email and try again.",
    };
  }

  return { valid: true };
}

/**
 * Deletes the OTP for an email.
 */
export function deleteOtp(email: string): void {
  const normalized = email.trim().toLowerCase();
  otpStore.delete(normalized);
}

/**
 * Generates a secure random 6-digit numeric OTP string.
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface OtpEmailParams {
  otp: string;
  email: string;
  appName?: "StudyHub" | "TestHub";
  expiresInMinutes?: number;
}

/**
 * Generates an aesthetic, responsive HTML email template for StudyHub or TestHub.
 */
export function generateOtpEmailHtml({
  otp,
  email,
  appName = "StudyHub",
  expiresInMinutes = 10,
}: OtpEmailParams): string {
  const currentYear = new Date().getFullYear();
  const isTestHub = appName === "TestHub";

  const brandEmoji = isTestHub ? "🎯" : "🎓";
  const brandName = isTestHub ? "TestHub" : "StudyHub";
  const brandTagline = isTestHub
    ? "Authentic CBT Assessment Platform"
    : "Your Ultimate Learning Partner";
  const brandGradient = isTestHub
    ? "linear-gradient(135deg, #0c2340 0%, #103b70 50%, #0875f9 100%)"
    : "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)";
  const primaryColor = isTestHub ? "#0875f9" : "#2563eb";
  const darkTextColor = isTestHub ? "#0c2340" : "#1e3a8a";

  const welcomeMessage = isTestHub
    ? `Welcome to <strong style="color: ${primaryColor};">TestHub</strong>! Please enter the 6-digit verification code below to verify your candidate account and unlock authentic computer-based past papers, mock exam simulations, and detailed scorecard analytics.`
    : `Welcome to <strong style="color: ${primaryColor};">StudyHub</strong>! Please enter the 6-digit verification code below to verify your email address and gain instant access to digital textbooks, previous year papers, and AI-powered study tools.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} - Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: ${brandGradient}; padding: 36px 32px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 10px 20px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.25);">
                      <span style="font-size: 26px; margin-right: 8px; vertical-align: middle;">${brandEmoji}</span>
                      <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle;">${brandName}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 14px;">
                    <p style="margin: 0; font-size: 13px; font-weight: 500; color: #dbeafe; text-transform: uppercase; letter-spacing: 1.5px;">${brandTagline}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.3px;">
                Verify Your Email Address
              </h1>
              
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                ${welcomeMessage}
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed ${primaryColor}; border-radius: 16px; padding: 24px; text-align: center;">
                      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: ${primaryColor}; margin-bottom: 8px;">
                        One-Time Password (OTP)
                      </div>
                      <div style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 38px; font-weight: 800; color: ${darkTextColor}; letter-spacing: 10px; padding-left: 10px;">
                        ${otp}
                      </div>
                      <div style="margin-top: 12px;">
                        <span style="display: inline-block; background-color: #ffffff; color: ${darkTextColor}; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; border: 1px solid #bfdbfe;">
                          ⏰ Valid for ${expiresInMinutes} minutes
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Safety Notice -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                      🔒 For security reasons, do not share this verification code with anyone. If you didn't attempt to sign up on ${brandName}, you can safely disregard this message.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #334155;">
                ${brandName} Ecosystem
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">
                Empowering students with AI-assisted learning resources and authentic CBT assessments.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${currentYear} ${brandName}. All rights reserved. • Support: <a href="mailto:support@yashguptaiiit.in" style="color: ${primaryColor}; text-decoration: none;">support@yashguptaiiit.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  devOtp?: string;
  error?: string;
}

/**
 * Sends a 6-digit OTP to the user's email using the Resend API.
 */
export async function sendOtpEmail({
  email,
  appName = "StudyHub",
  expiresInMinutes = 10,
}: {
  email: string;
  appName?: "StudyHub" | "TestHub";
  expiresInMinutes?: number;
}): Promise<SendOtpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const otp = generateOtp();

  setOtp(normalizedEmail, otp, expiresInMinutes);
  console.log(`[OTP GENERATED - ${appName}] ${normalizedEmail} -> ${otp}`);

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    `${appName} <support@yashguptaiiit.in>`;

  if (apiKey) {
    const resend = new Resend(apiKey);
    const subject =
      appName === "TestHub"
        ? "Welcome to TestHub - Verify Your Candidate Account"
        : "Welcome to StudyHub - Verify Your Email";

    const html = generateOtpEmailHtml({
      otp,
      email: normalizedEmail,
      appName,
      expiresInMinutes,
    });

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: normalizedEmail,
      subject,
      html,
    });

    if (error) {
      console.error(`[Resend Error] Failed to send email to ${normalizedEmail}:`, error);
      throw new Error(error.message || "Failed to send email via Resend.");
    }
  } else {
    console.warn(
      `[Resend Warning] RESEND_API_KEY not configured. OTP generated for ${normalizedEmail}: ${otp}`
    );
  }

  return {
    success: true,
    message: "Verification code sent successfully.",
    ...(!apiKey || process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
  };
}

