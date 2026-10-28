# 🔐 Shared Authentication & Verification Library (`@repo/auth`)

[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-v4.24-black?logo=next.js)](https://next-auth.js.org/)
[![OAuth 2.0](https://img.shields.io/badge/OAuth-Google-4285F4?logo=google)](https://developers.google.com/identity)
[![Resend](https://img.shields.io/badge/Resend-Email%20Verification-000000?logo=resend)](https://resend.com/)
[![bcrypt](https://img.shields.io/badge/bcrypt-Salted%20Hashing-green)](https://github.com/kelektiv/node.bcrypt.js)

The `@repo/auth` package provides shared authentication options, session providers, role validation, password cryptography, and Resend-powered OTP email verification across `apps/web` and `apps/testhub`.

---

## ⚡ Features

### 1. Unified Authentication Providers
- **Credentials Provider**: Email and salted password login using `bcrypt` comparison against the PostgreSQL `User` table.
- **Google OAuth 2.0**: Automatic account creation and federated authentication.

### 2. Email OTP Verification (Resend API)
- **Shared OTP Store**: Time-to-live expired token verification (10-minute validity) with automatic cleanup.
- **Branded Email Templates**: Responsive HTML email templates tailored with StudyHub and TestHub visual identities.
- **Developer Friendly**: Automatically prints generated OTPs to terminal logs in non-production environments when `RESEND_API_KEY` is pending.

### 3. Cross-Application Single Sign-On (SSO)
- Configured cookie handling (`next-auth.session-token`) with optional `COOKIE_DOMAIN` to enable shared sessions between StudyHub (`http://localhost:3000`) and TestHub (`http://localhost:3001`).

### 4. Role-Based Access Control (RBAC)
- Role hierarchy: `STUDENT` < `TEACHER` < `ADMIN`.
- Built-in session helpers: `getAuthSession`, `getExamSession`, and `hasExamAccess`.

---

## 📦 Usage Examples

### 1. Sending OTP Verification Email

```typescript
import { sendOtpEmail } from "@repo/auth/otp";

const result = await sendOtpEmail({
  email: "candidate@example.com",
  appName: "TestHub", // or "StudyHub"
  expiresInMinutes: 10,
});
```

### 2. Verifying OTP Code

```typescript
import { verifyOtp, deleteOtp } from "@repo/auth/otp";

const verification = verifyOtp(email, enteredOtp);
if (!verification.valid) {
  throw new Error(verification.reason);
}

// Proceed with user creation...
deleteOtp(email);
```

### 3. Next.js App Router Route Handler (`route.ts`)

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@repo/auth";

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
```

---

## 🛠️ Required Environment Variables

```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000" # or http://localhost:3001 for TestHub
NEXTAUTH_SECRET="your-nextauth-secret-key"

# Resend API for OTP Emails
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="StudyHub <support@yashguptaiiit.in>"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional cross-subdomain cookie domain in production
COOKIE_DOMAIN=".studyhub.example.com"
```
