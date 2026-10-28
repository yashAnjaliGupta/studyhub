# 🌐 StudyHub Web Application (`apps/web`)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3%20%26%20CloudFront-orange?logo=amazon-aws)](https://aws.amazon.com/s3/)

**StudyHub Web** is the flagship student-facing web application of the StudyHub monorepo. It delivers a seamless digital learning experience with digital textbook reading, Previous Year Question Paper (PYQP) browsing, in-browser PDF viewing, an embedded AI study assistant with citation support, and admin document uploads.

---

## ⚡ Features

### 1. Digital Textbooks & Chapter Hub
- **Hierarchical Course Structure**: Browse textbooks by **Board** (NCERT, State Boards), **Class** (Class 9 through 12), **Subject** (Mathematics, Physics, Chemistry, Biology, etc.), and **Book**.
- **Interactive Chapter Reader**: Read individual chapters with fast PDF streaming powered by `react-pdf` and `pdfjs-dist`.
- **Custom CDN Delivery**: Document streaming backed by Amazon S3 and Amazon CloudFront CDN.

### 2. Previous Year Question Papers (PYQP)
- **Exam Filter & Archive**: Search, preview, and download past examination papers for JEE Main, JEE Advanced, CBSE, and State Board exams.
- **Direct Download & In-Browser Preview**: Fast page switching, zoom controls, and instant local downloads.

### 3. AI Study Assistant (RAG Chatbot)
- **Contextual Page Retrieval**: Embedded floating chatbot (`@repo/ui/FloatingChatbot`) on chapter pages queries PostgreSQL `pgvector` embeddings.
- **Page-Level Citations**: AI responses cite exact page numbers and allow users to jump to the cited textbook page with one click.
- **LaTeX Math Rendering**: Formatted mathematical formulas rendered natively via KaTeX (`MathText`).

### 4. Admin Management & Document Uploads
- **Presigned S3 Uploads**: Secure document uploads using S3 presigned URLs (`/admin/upload`).
- **Configurable Access**: Protected by NextAuth with role checks configured via `ADMIN_EMAIL`.

### 5. Telemetry & User Insights
- **Kafka Telemetry Integration**: Tracks page views, navigation, search events, and interactions via `@repo/telemetry` producing to Apache Kafka.

---

## 📁 Directory Structure

```
apps/web/
├── actions/                  # Server Actions (S3 Presigned URLs, Upload confirmation)
│   ├── GetPresignedUrl.ts
│   └── MarkUploadSuccessful.ts
├── app/                      # Next.js 16 App Router
│   ├── [Exam]/               # Dynamic Board/Exam browsing routes
│   │   └── [Class]/
│   │       └── [Subject]/
│   ├── admin/                # Admin document upload interface
│   ├── api/                  # API Routes (auth, chat, search, telemetry, pdf downloads)
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── chat/             # Bedrock RAG vector search & Claude response endpoint
│   │   ├── search/           # Dynamic textbook & chapter search
│   │   └── telemetry/        # Kafka telemetry proxy endpoint
│   ├── layout.tsx            # Global layout with local Geist fonts & TelemetryProvider
│   └── page.tsx              # Homepage
├── components/               # Web-specific React components
│   ├── PDFViewer/            # react-pdf document viewer
│   ├── FloatingChatbot.tsx   # Contextual RAG chatbot wrapper
│   ├── FileUpload.tsx        # S3 upload form with progress indicator
│   ├── Navbar.tsx            # Navigation header with auth dropdown
│   └── SearchBar.tsx         # Instant fuzzy search for books and chapters
├── lib/                      # Utilities (S3 client, telemetry client)
└── package.json
```

---

## 🛠️ Environment Variables

Create `.env` inside `apps/web/`:

```env
# Database Connection (PostgreSQL + pgvector)
DATABASE_URL="postgresql://user:password@localhost:5432/studybyd?schema=public"

# AWS Configuration (S3 & Bedrock)
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXT_PUBLIC_CDN_URL="https://your-cdn-domain.com/"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Admin User Email
ADMIN_EMAIL="admin@example.com"

# Email Service (Resend)
RESEND_API_KEY="re_your_resend_api_key"

# Apache Kafka Telemetry
KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
KAFKA_TOPIC="web_telemetry"
```

---

## 🚀 Development & Scripts

From the repository root or `apps/web/`:

| Command | Action |
| :--- | :--- |
| `npm run dev:web` | Run development server on [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Build production Next.js bundle |
| `npm run start:web` | Start production server on port 3000 |
| `npm run check-types` | Run TypeScript validation |
| `npm run lint` | Run ESLint checks |
