/**
 * Email template generators for StudyHub
 */

interface OtpEmailParams {
  otp: string;
  email: string;
  expiresInMinutes?: number;
}

export function generateOtpEmailHtml({ otp, email, expiresInMinutes = 10 }: OtpEmailParams): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudyHub - Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%); padding: 36px 32px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); padding: 10px 20px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.25);">
                      <span style="font-size: 26px; margin-right: 8px; vertical-align: middle;">🎓</span>
                      <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle;">StudyHub</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 14px;">
                    <p style="margin: 0; font-size: 13px; font-weight: 500; color: #dbeafe; text-transform: uppercase; letter-spacing: 1.5px;">Your Ultimate Learning Partner</p>
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
                Welcome to <strong style="color: #1e40af;">StudyHub</strong>! Please use the verification code below to complete your registration and get instant access to notes, previous year papers, and AI-powered study tools.
              </p>

              <!-- OTP Container -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed #3b82f6; border-radius: 16px; padding: 24px; text-align: center;">
                      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb; margin-bottom: 8px;">
                        One-Time Password (OTP)
                      </div>
                      <div style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 36px; font-weight: 800; color: #1e3a8a; letter-spacing: 10px; padding-left: 10px;">
                        ${otp}
                      </div>
                      <div style="margin-top: 12px;">
                        <span style="display: inline-block; background-color: #ffffff; color: #1e40af; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; border: 1px solid #bfdbfe;">
                          ⏰ Valid for ${expiresInMinutes} minutes
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Safety Note -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                      🔒 For security reasons, do not share this code with anyone. If you didn't request this email, you can safely ignore it.
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
                StudyHub
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">
                Empowering students with AI-assisted learning resources.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${currentYear} StudyHub. All rights reserved. • Need help? Contact <a href="mailto:support@yashguptaiiit.in" style="color: #2563eb; text-decoration: none;">support@yashguptaiiit.in</a>
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
