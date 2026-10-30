# 🌐 StudyHub Web Application (`apps/web`)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3%20%26%20CloudFront-orange?logo=amazon-aws)](https://aws.amazon.com/s3/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20AI-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)

**StudyHub Web** is the student-facing digital library and textbook-grounded learning application of the StudyHub monorepo. It features comprehensive textbook browsing (NCERT and State Boards), high-performance in-browser PDF rendering, a contextual RAG AI study assistant with page-level citations, secure S3 uploads, and distributed candidate authentication.

---

## ⚡ Core Features

### 1. Multi-Tiered Digital Textbook Catalog
- **Structured Academic Hierarchy**: Seamless navigation through **Board** (NCERT, CBSE, State Boards) ➔ **Class** (Class 9 through 12) ➔ **Subject** (Mathematics, Physics, Chemistry, Biology) ➔ **Book** ➔ **Chapter**.
- **Interactive Chapter Reader**: High-performance in-browser PDF reader powered by `react-pdf` and `pdfjs-dist` with page zoom, two-page layout, and fast page jumping.
- **Optimized CDN Streaming**: Textbook assets served via Amazon S3 and cached globally through Amazon CloudFront CDN.

### 2. Retrieval-Augmented Generation (RAG) AI Assistant
- **Titan V2 Embeddings (1024-dim)**: Textbook chapters are chunked and converted into 1024-dimensional vector embeddings stored in PostgreSQL using `pgvector`.
- **Contextual Page Citations**: Responses from Claude 3.5 Sonnet / Haiku explicitly cite page numbers (`[Page 42]`). Clicking any citation automatically scrolls the PDF reader to the exact referenced textbook page.
- **LaTeX Math Rendering**: Formulas, fractions, and chemical equations render natively via KaTeX (`MathText`).

### 3. Secure Admin Document Uploads
- **Presigned Amazon S3 Uploads**: Upload heavy PDF textbooks and past year question papers directly to Amazon S3 via secure presigned URLs (`actions/GetPresignedUrl.ts`).
- **Access Control**: Restricted to administrators defined via `ADMIN_EMAIL`.

### 4. Distributed Authentication & Resend OTP
- **Cross-App SSO**: Shared NextAuth session cookies across subdomains (`.yourdomain.com`).
- **Distributed OTP Verification**: 6-digit email verification codes backed by Upstash Redis with a 10-minute TTL.

### 5. Event Telemetry Pipeline
- Non-blocking telemetry hooks publishing candidate reading progress and search actions directly to Apache Kafka (`studyhub-telemetry`).

---

## 📁 Directory Structure

```
apps/web/
├── actions/                  # Next.js Server Actions (S3 Presigned URLs, Upload confirmation)
│   ├── GetPresignedUrl.ts    # Secure S3 presigned URL generator with role check
│   └── MarkUploadSuccessful  # DB status updater
├── app/                      # Next.js App Router
│   ├── [Exam]/               # Dynamic Board/Exam browsing routes
│   │   └── [Class]/
│   │       └── [Subject]/
│   │           └── [Book]/   # Chapter list & interactive PDF reader
│   ├── admin/                # Admin document upload portal
│   ├── api/                  # API endpoints
│   │   ├── auth/             # NextAuth authentication handlers
│   │   ├── chat/             # Bedrock RAG vector search & AI streaming endpoint
│   │   ├── document-status/  # Processing status poller
│   │   ├── download-pdf/     # PDF download helper
│   │   ├── search/           # Fuzzy textbook & chapter search
│   │   └── telemetry/        # Non-blocking Kafka telemetry proxy
│   ├── signin/ & signup/     # Candidate authentication pages
│   ├── layout.tsx            # Root layout with TelemetryProvider & Geist font
│   └── page.tsx              # StudyHub homepage
├── components/               # Web UI components
│   ├── FileUpload.tsx        # Drag-and-drop S3 upload form with progress indicator
│   ├── FloatingChatbot.tsx   # Contextual RAG AI study assistant
│   ├── Navbar.tsx            # Navigation header with auth profile dropdown
│   ├── PDFViewer/            # react-pdf document viewer
│   └── SearchBar.tsx         # Instant search bar
├── lib/                      # Utilities
│   ├── embeddings.ts         # Amazon Titan V2 embedding client
│   ├── redis.ts              # Upstash Redis client
│   ├── s3.ts                 # AWS S3 client and CloudFront URL resolver
│   └── telemetry.ts          # Kafka dispatch utility
└── package.json
```

---

## 🛠️ Environment Variables

Create `.env` inside `apps/web/` or reference the root `.env`:

```env
# Database Connection (PostgreSQL + pgvector)
DATABASE_URL="postgresql://postgres:password@localhost:5432/studyhub?schema=public"

# AWS Configuration (S3 & Bedrock)
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXT_PUBLIC_CDN_URL="https://your-cdn-domain.com/"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-nextauth-secret-key"
COOKIE_DOMAIN="" # Set to .yourdomain.com for cross-app SSO in production

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Admin User Email
ADMIN_EMAIL="admin@yourdomain.com"

# Email Service (Resend OTP Verification)
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="StudyHub <auth@yourdomain.com>"

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Apache Kafka Telemetry
KAFKA_BROKERS="localhost:9092"
KAFKA_TOPIC="studyhub-telemetry"
```

---

## 🚀 Development & Production

```bash
# Run StudyHub Web in development mode (port 3000)
npm run dev:web

# Build StudyHub Web in Next.js standalone mode
npm run build --workspace=web

# Start production server
npm run start:web
```
