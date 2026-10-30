# 🎓 StudyHub — AI-Powered Learning & Examination Ecosystem

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.9.18-ef4444?logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL%20%26%20pgvector-2D3748?logo=prisma)](https://www.prisma.io/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20%26%20S3-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Apache Kafka](https://img.shields.io/badge/Apache-Kafka-231F20?logo=apache-kafka)](https://kafka.apache.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-PDF%20Parser-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

**StudyHub** is a next-generation educational and Computer-Based Testing (CBT) platform engineered for students preparing for school board examinations and high-stakes national entrance exams (**JEE Main**, **JEE Advanced**, **NEET**, **CBSE**). Built as an enterprise-grade **Turborepo monorepo**, StudyHub pairs a digital textbook reader and textbook-grounded RAG study assistant with a high-fidelity CBT exam simulator (**TestHub**), advanced behavioral diagnostic telemetry, automated AI mentorship via **AWS Bedrock**, an **Apache Kafka event pipeline**, and a Python **FastAPI PDF parsing microservice**.

---

## 📸 Visual Product Walkthrough

Experience the complete end-to-end examination and learning journey:

### 1. 📚 Paper Library & Discovery
Filter past year examination papers by **Exam Type** (JEE Main, JEE Advanced, NEET), **Year** (2002–2025), and **Subject** (Physics, Chemistry, Mathematics, Biology).
![Exam Paper Library](screenshots/flow-2438/01_papers_library.png)

### 2. 📝 Official Bilingual Instructions
Authentic exam instructions matching national testing agencies (NTA) with duration, marking rules (+4 / -1 / 0), and navigation guidelines.
![Bilingual Exam Instructions](screenshots/flow-2438/03_exam_instructions.png)

### 3. 🎯 Authentic CBT Test Interface & Live Simulation
Real-time countdown timer, high-fidelity KaTeX math equations, diagram support, single/multiple-choice MCQs, and numerical inputs with error tolerances.
![Live CBT Examination Screen](screenshots/flow-2438/05_exam_cbt_interface_q1.png)

### 4. 🗂️ 5-State Question Palette & Subject Navigation
Real-time state tracking: ⚪ *Not Visited*, 🔴 *Not Answered*, 🟢 *Answered*, 🟣 *Marked for Review*, and 🟣🟢 *Answered & Marked for Review*.
![Question Palette & Section Switching](screenshots/flow-2438/07_exam_palette_status.png)

### 5. 🏆 Instant Scorecard & Section Breakdown
Comprehensive summary displaying total awarded score, percentage accuracy, time spent per subject, and candidate rank estimation.
![Results Scorecard](screenshots/flow-2438/09_exam_results_scorecard.png)

### 6. 📊 6-Section Diagnostic Analytics & Interactive Performance Charts
In-depth behavioral analysis classifying time traps, guesswork, rushing patterns, and topic-by-topic mastery curves.
![Detailed Diagnostic Analytics](screenshots/flow-2438/10_detailed_analysis.png)

### 7. 🤖 AI Mentor Strategic Insights (AWS Bedrock)
Personalized post-exam mentorship powered by Claude 3.5 Sonnet / Haiku diagnosing root causes of mistakes and recommending focused high-yield revision topics.
![AI Guidance & Strategic Insights](screenshots/flow-2438/11_ai_guidance_insights.png)

---

## 🏗️ Monorepo Architecture

```
StudyHub Monorepo
├── apps/
│   ├── web/                    # Digital textbook reader, PYQ browser, S3 uploads & RAG chatbot (:3000)
│   └── testhub/                # CBT examination engine, JEE past paper tests & AI analytics (:3001)
├── packages/
│   ├── ai/                     # AWS Bedrock runtime (Titan Embeddings V2 1024-dim, Claude 3.5 Sonnet)
│   ├── auth/                   # Shared NextAuth.js, cross-app SSO cookies, bcrypt, OTP & RBAC
│   ├── db/                     # Prisma ORM schema (PostgreSQL + pgvector) & database migrations
│   ├── exam-core/              # Canonical CBT exam schemas, topic taxonomy & behavioral classification
│   ├── telemetry/              # Apache Kafka telemetry producer & React tracking hooks
│   ├── ui/                     # Shared React 19 UI component library, KaTeX math & Tailwind v4
│   ├── eslint-config/          # Shared ESLint 9 Flat Config presets
│   └── typescript-config/      # Shared TypeScript base presets
├── services/
│   └── pdf-parser/             # FastAPI STEM document layout, watermark & diagram parsing service (:8001)
└── docker-compose.yml          # Local development stack (PostgreSQL + pgvector, Kafka, ZooKeeper)
```

---

## ✨ Flagship Applications & Features

### 1. 🌐 StudyHub Web (`apps/web` — Port 3000)
- **Digital Textbook Repository**: Multi-tiered catalog structured by Board, Class, Subject, Book, and Chapter.
- **In-Browser PDF Reader**: Smooth page navigation, zooming, and downloading powered by `react-pdf` and `pdfjs-dist`.
- **RAG AI Chatbot**: Embedded assistant querying `PageEmbedding` vectors (`vector(1024)`) in PostgreSQL via Amazon Titan Embeddings V2, featuring **one-click page citations** directly to textbook pages.
- **Admin Document Upload**: Presigned Amazon S3 document uploads secured by NextAuth and role-based permissions.
- Read more in [apps/web/README.md](apps/web/README.md).

### 2. 🎯 TestHub CBT Platform (`apps/testhub` — Port 3001)
- **National Exam Simulation**: True-to-life CBT test interface matching NTA / official national exam specifications.
- **Question Types**: Single-choice MCQ, multiple-choice MCQ, and numerical value inputs with floating-point tolerance ranges.
- **Diagram Scratchpad Canvas**: In-browser drawing pad to annotate circuit diagrams, free-body diagrams, and scratch work.
- **6-Section Behavioral Diagnostics**: Real-time behavioral engine detecting:
  - ⏳ **Time Traps**: Questions with excessive time spent resulting in incorrect answers.
  - ⚡ **Rushing Mistakes**: Questions answered under 20 seconds resulting in negative marks.
  - 🎲 **Guesswork Detection**: Option switches and pattern anomalies.
- **Hot Caching with Upstash Redis**: Sub-millisecond attempt lookup and session persistence.
- **AI Solution Explanations**: Post-exam analysis chatbot breaking down step-by-step mathematical proofs and concepts.
- Read more in [apps/testhub/README.md](apps/testhub/README.md).

### 3. 🔬 PDF Parser Microservice (`services/pdf-parser` — Port 8001)
- **STEM Layout Detection**: Detects single vs. multi-column layouts and orders reading blocks sequentially.
- **Watermark & Ad Stripping**: Automatically removes coach-institute watermarks, promo headers, and footers.
- **Diagram Extraction**: Isolates vector schematics and raster images, converting them into optimized `.webp` or vector SVG assets.
- **Formula Protection**: Preserves LaTeX mathematical symbols for KaTeX rendering.
- Read more in [services/pdf-parser/README.md](services/pdf-parser/README.md).

---

## 🛠️ Tech Stack & Tooling

| Domain | Technologies |
| :--- | :--- |
| **Frameworks** | Next.js 16.2.0 (App Router, Standalone mode), React 19.2.0, FastAPI (Python 3.11+) |
| **Monorepo Tooling** | Turborepo 2.9, npm Workspaces |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Framer Motion, KaTeX Math Rendering |
| **Database & Vector Search** | PostgreSQL 16+ (Neon & Docker), Prisma ORM, `pgvector` (`vector(1024)`) |
| **Distributed Caching & State** | Upstash Redis REST API, in-memory LRU fallback |
| **AI / LLM Infrastructure** | AWS Bedrock (Amazon Titan Embeddings V2, Claude 3.5 Sonnet / Haiku), Google Gemini |
| **Storage & Delivery** | Amazon S3, Amazon CloudFront CDN |
| **Authentication & RBAC** | NextAuth.js v4 (Cross-App SSO, Google OAuth, Salted bcrypt, Resend OTP) |
| **Telemetry & Streaming** | Apache Kafka, ZooKeeper, KafkaJS |
| **Containers & CI** | Docker, Docker Compose, GitHub Actions (`build.yml`) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher (`v24.x` recommended)
- **npm**: `>=10.x`
- **Python**: `3.11+` (for `services/pdf-parser`)
- **Docker**: For running PostgreSQL + pgvector and Kafka locally
- **AWS Credentials**: With access to Amazon S3 and AWS Bedrock Runtime

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/StudyHub.git
cd StudyHub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Local Infrastructure (Docker)

```bash
docker compose up -d
```
This spins up:
- **PostgreSQL with pgvector** on `localhost:5432` (`studyhub_postgres`)
- **ZooKeeper** on `localhost:2181`
- **Apache Kafka** on `localhost:9092`

### 4. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure your `.env` contains your database and AWS credentials:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/studyhub?schema=public"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXTAUTH_SECRET="your-generated-nextauth-secret-key"
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
RESEND_API_KEY="re_your_resend_api_key"
```

### 5. Setup Database & Prisma Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Enable pgvector extension
npm run init:vector

# Apply database migrations
cd packages/db && npx prisma migrate deploy && cd ../..
```

### 6. Run the Applications

```bash
# Run all applications simultaneously via Turborepo:
npm run dev

# Or run specific applications individually:
npm run dev:web       # StudyHub Web on http://localhost:3000
npm run dev:testhub   # TestHub CBT on http://localhost:3001
npm run parser:dev    # PDF Parser on http://localhost:8001
```

---

## 🛠️ Monorepo Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts all apps in development mode via Turborepo |
| `npm run dev:web` | Starts only StudyHub Web (`apps/web` on port 3000) |
| `npm run dev:testhub` | Starts only TestHub CBT (`apps/testhub` on port 3001) |
| `npm run build` | Builds all applications & packages across the monorepo |
| `npm run start:web` | Starts the production server for StudyHub Web |
| `npm run start:testhub` | Starts the production server for TestHub CBT |
| `npm run check-types` | Validates TypeScript across all monorepo workspaces |
| `npm run lint` | Runs ESLint across all monorepo workspaces |
| `npm run format` | Formats all code using Prettier |
| `npm run db:generate` | Generates the Prisma client inside `packages/db` |
| `npm run ingest:pyq` | Ingests previous year question papers into the database |
| `npm run parser:dev` | Launches the Python FastAPI PDF parsing microservice |

---

## 📡 Apache Kafka Telemetry Setup

StudyHub publishes candidate interaction telemetry (page transitions, question palette events, answer modifications, and review flags) directly to Apache Kafka:

1. **Start Kafka**:
   ```bash
   docker compose up -d zookeeper kafka
   ```
2. **Listen to telemetry events live**:
   ```bash
   docker exec -it studyhub_kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic exam-telemetry --from-beginning
   ```

---

## 🚢 CI/CD & Production Verification

StudyHub uses GitHub Actions to verify type safety and code quality:
- **Workflow**: [.github/workflows/build.yml](.github/workflows/build.yml)
- **Validation**: Automatically runs `npm install`, `npm run db:generate`, and `npm run build` on PRs targeting `main`.
- **Pre-commit Checks**: Run `npm run check-types` and `npm run lint` locally before submitting pull requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
