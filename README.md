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

**StudyHub** is an all-in-one educational and computer-based testing (CBT) platform designed for students preparing for school board examinations and competitive entrance exams (**JEE Main**, **JEE Advanced**, **NEET**, **CBSE**). Built as a high-performance **Turborepo monorepo**, StudyHub integrates digital textbook reading, an AI study assistant powered by **AWS Bedrock** and **pgvector**, past year question paper (PYQ) processing, a full CBT test simulator (**TestHub**), a dedicated Python **FastAPI PDF parsing microservice**, and an **Apache Kafka telemetry pipeline**.

---

## 🏗️ Monorepo Architecture

```
StudyHub Monorepo
├── apps/
│   ├── web/                    # Digital textbook reader, PYQ browser, S3 uploads & RAG chatbot (:3000)
│   └── testhub/                # CBT examination engine, JEE past paper tests & AI analytics (:3001)
├── packages/
│   ├── ai/                     # AWS Bedrock runtime (Titan Embeddings V2 1024-dim, Claude 3 Sonnet)
│   ├── auth/                   # Shared NextAuth.js, cross-app SSO cookies, bcrypt & role security
│   ├── db/                     # Prisma ORM schema (PostgreSQL + pgvector) & dual-db sync
│   ├── exam-core/              # Canonical CBT exam schemas, topic taxonomy & scoring logic
│   ├── telemetry/              # Apache Kafka telemetry producer & React tracking hooks
│   ├── ui/                     # Shared React 19 UI component library, KaTeX math & Tailwind v4
│   ├── eslint-config/          # Shared ESLint 9 Flat Config presets
│   └── typescript-config/      # Shared TypeScript base presets
├── services/
│   └── pdf-parser/             # FastAPI STEM document layout, watermark & diagram parsing service (:8001)
├── scripts/
│   ├── pyq-pipeline/           # Automated JEE PYQ crawler, downloader, extractor & S3 dual-sync
│   ├── init-vector.ts          # Script to enable pgvector extension on PostgreSQL
│   └── sync-s3.ts              # Script to synchronize S3 bucket documents with the database
└── docker-compose.yml          # Local development stack (PostgreSQL + pgvector, Kafka, ZooKeeper)
```

---

## ✨ Applications & Services Overview

### 1. 🌐 StudyHub Web (`apps/web` — Port 3000)
- **Digital Textbooks**: Browse NCERT and State Board textbooks by Board, Class, Subject, Book, and Chapter.
- **In-Browser PDF Reader**: Smooth page navigation, zooming, and downloading via `react-pdf`.
- **RAG AI Chatbot**: Embedded assistant with inline citations and one-click page navigation to original textbook pages.
- **Admin Document Upload**: Presigned Amazon S3 document uploads secured by NextAuth.
- Read more in [apps/web/README.md](apps/web/README.md).

### 2. 🎯 TestHub CBT Platform (`apps/testhub` — Port 3001)
- **National Exam Simulation**: Authentic CBT test interface matching NTA / official exam environments.
- **Question Types**: Single-choice MCQ, multiple-choice MCQ, and numerical value inputs with error margins.
- **Diagram Canvas**: In-browser drawing pad to sketch circuit diagrams, free-body diagrams, and scratch work.
- **AI Solution Explanations**: Post-exam analysis chatbot breaking down solutions step-by-step.
- **Performance Analytics**: Real-time topic accuracy metrics and scoring calculation (+4 / -1 / 0).
- Read more in [apps/testhub/README.md](apps/testhub/README.md).

### 3. 🔬 PDF Parser Microservice (`services/pdf-parser` — Port 8001)
- **STEM Layout Detection**: Detects single vs. multi-column layouts and orders blocks correctly.
- **Watermark & Ad Stripping**: Automatically removes coach-institute watermarks, promo headers, and footers.
- **Diagram Extraction**: Isolates vector schematics and raster images, converting them into compressed `.webp` assets.
- **Formula Protection**: Preserves LaTeX mathematical symbols for KaTeX rendering.
- Read more in [services/pdf-parser/README.md](services/pdf-parser/README.md).

### 4. 🤖 PYQ Ingestion Pipeline (`scripts/pyq-pipeline`)
- Crawls past examination papers spanning 2002 to 2025.
- Downloads raw PDFs, extracts questions and answer keys, builds clean branded PDFs, uploads to S3, and synchronizes with PostgreSQL.
- Read more in [scripts/pyq-pipeline/README.md](scripts/pyq-pipeline/README.md).

---

## 🛠️ Tech Stack & Tooling

| Domain | Technologies |
| :--- | :--- |
| **Frameworks** | Next.js 16.2.0 (App Router), React 19.2.0, FastAPI (Python 3.11+) |
| **Monorepo Tooling** | Turborepo 2.9, npm Workspaces |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Framer Motion, KaTeX |
| **Database & Vector Search** | PostgreSQL 16+ (Neon & Docker), Prisma ORM, `pgvector` (`vector(1024)`) |
| **AI / LLM Infrastructure** | AWS Bedrock (Amazon Titan Embeddings V2, Claude 3 Sonnet), Google Gemini Vision |
| **Storage & Delivery** | Amazon S3, Amazon CloudFront CDN |
| **Authentication** | NextAuth.js v4 (Cross-Port SSO, Google OAuth, Salted bcrypt) |
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

Copy `.env.example` to `.env` or set up app-specific files:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/testhub/.env.example apps/testhub/.env
cp packages/db/.env.example packages/db/.env
cp services/pdf-parser/.env.example services/pdf-parser/.env
```

Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/studybyd?schema=public"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXTAUTH_SECRET="your-nextauth-secret-key"
```

### 5. Setup Database & Prisma

```bash
# Generate Prisma Client
npm run db:generate

# Enable pgvector extension
npm run init:vector

# (Optional) Apply migrations
cd packages/db && npx prisma migrate deploy && cd ../..
```

### 6. Run the Applications

```bash
# Run all monorepo apps simultaneously:
npm run dev

# Or run specific applications:
npm run dev:web       # StudyHub Web on http://localhost:3000
npm run dev:testhub   # TestHub CBT on http://localhost:3001
npm run parser:dev    # PDF Parser on http://localhost:8001
```

---

## 🛠️ Monorepo Scripts Reference

Run these scripts from the repository root:

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
| `npm run init:vector` | Executes raw SQL to activate the PostgreSQL `pgvector` extension |
| `npm run sync-s3` | Synchronizes S3 bucket documents with the `File` database table |
| `npm run ingest:pyq` | Runs the automated JEE past-paper ingestion pipeline |
| `npm run parser:dev` | Launches the Python FastAPI PDF parsing microservice |

---

## 📡 Apache Kafka Telemetry Setup

StudyHub publishes user interaction telemetry (page views, exam events, answer selections) directly to Apache Kafka:

1. **Start Kafka**:
   ```bash
   docker compose up -d zookeeper kafka
   ```
2. **Listen to telemetry events live**:
   ```bash
   docker exec -it studyhub_kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic web_telemetry --from-beginning
   ```
3. Read [packages/telemetry/README.md](packages/telemetry/README.md) for producer and consumer details.

---

## 🚢 CI/CD & Testing

StudyHub uses GitHub Actions to ensure code quality on every Pull Request:
- **Workflow**: [.github/workflows/build.yml](.github/workflows/build.yml)
- **Validation**: Automatically runs `npm install`, `npm run db:generate`, and `npm run build` on PRs targeting `main`.

---

## 🤝 Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Verify type-checking and linting pass:
   ```bash
   npm run check-types
   npm run lint
   ```
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
