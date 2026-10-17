# 🎓 StudyHub — AI-Powered Educational & Learning Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.9.18-ef4444?logo=turborepo)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20%26%20S3-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

**StudyHub** is a state-of-the-art, AI-powered educational platform designed to streamline learning, textbook reading, and exam preparation. Built as a high-performance **Turborepo monorepo**, StudyHub integrates NCERT and State Board textbooks, Previous Year Question Papers (PYQPs), an interactive PDF reader, and a intelligent AI Study Assistant powered by **AWS Bedrock** and vector search (**pgvector**).

---

## ✨ Features

### 🧠 1. AI-Powered Study Assistant (RAG Chatbot)
- **Contextual Retrieval-Augmented Generation (RAG)**: Ask questions directly about any textbook chapter, study material, or uploaded PDF.
- **AWS Bedrock & Titan Embeddings**: Utilizes Amazon Titan Text Embeddings V2 (`vector(1024)`) and Claude models via AWS Bedrock Runtime for accurate, domain-agnostic response synthesis.
- **Vector Search Engine**: High-speed semantic search over page chunks stored in PostgreSQL with `pgvector`.
- **Page-Level Citations**: Provides exact page numbers and inline references so students can verify AI-generated answers against original text.
- **Floating Interactive Assistant**: Modern glassmorphic chat widget (`framer-motion`) embedded on all textbook pages.

### 📚 2. Textbooks & Chapter Hub
- **Hierarchical Categorization**: Browse educational content dynamically by **Board** (e.g., NCERT, State Boards), **Class**, **Subject**, **Book**, and **Chapter**.
- **CDN Accelerated**: High-speed document streaming backed by AWS S3 and AWS CloudFront CDN.
- **Book Cover & Metadata Library**: Structured metadata indexing for textbook discovery.

### 📄 3. Interactive PDF Reader
- **In-Browser Document Viewer**: Built with `react-pdf` and `pdfjs-dist` for smooth rendering without third-party plugins.
- **Custom Page Navigation**: Jump to specific pages, zoom, toggle view modes, and download original files directly.

### 📝 4. Previous Year Question Papers (PYQPs)
- **Exam & Year Indexing**: Filter and search through past examination papers by Exam type, Class, Subject, and Year.
- **One-Click Preview & Download**: Instant document streaming and high-speed CDN downloads.

### 📤 5. Custom Document Upload & Indexing
- **Personalized Notes**: Upload custom PDF study materials directly to AWS S3.
- **Automated Text Extraction & Chunking**: Index personal notes for instant querying with the AI Study Assistant.

### 🔐 6. Authentication & User Management
- **NextAuth.js Integration**: Secure authentication supporting multiple identity providers.
- **OAuth 2.0 & Credentials**: Google Sign-In support and Email/Password credentials with salted `bcrypt` password hashing.

### ⚡ 7. Monorepo Architecture & DevOps
- **Turborepo**: Optimized caching and parallel build pipeline across workspace apps and packages.
- **Dockerized**: Containerized deployment setup ([Dockerfile](file:///e:/Co-hort/StudyHub/Dockerfile)) ready for cloud deployment.
- **GitHub Actions CI/CD**: Automated pipeline ([deploy.yml](file:///e:/Co-hort/StudyHub/.github/workflows/deploy.yml)) to build and push containers to **AWS ECR** and trigger **AWS ECS** zero-downtime deployments.

---

## 🏗️ Architecture & Tech Stack

```
StudyHub Monorepo
├── apps/
│   └── web/                # Next.js 16 (App Router), React 19, TailwindCSS, NextAuth
└── packages/
    ├── db/                 # Prisma ORM, PostgreSQL schema with pgvector
    ├── ui/                 # Shared UI React component library
    ├── eslint-config/      # Shared ESLint configuration
    └── typescript-config/  # Shared TypeScript configurations
```

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19 |
| **Monorepo Tooling** | Turborepo |
| **Styling** | TailwindCSS, Lucide React, Framer Motion |
| **Database** | PostgreSQL (Neon) + `pgvector` extension |
| **ORM** | Prisma ORM (`@repo/db`) |
| **AI / LLM Infrastructure** | AWS Bedrock (Titan Embeddings V2 & Claude) |
| **File Storage & CDN** | AWS S3 + AWS CloudFront |
| **Authentication** | NextAuth.js (Google OAuth, Email/Password Credentials) |
| **Containers & CI/CD** | Docker, GitHub Actions, AWS ECR, AWS ECS |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (`>=10.x`)
- **Database**: PostgreSQL instance with the `vector` (`pgvector`) extension enabled (e.g., [Neon](https://neon.tech/)).
- **AWS Account**: AWS IAM Credentials with access to AWS Bedrock Runtime and S3.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/StudyHub.git
cd StudyHub
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` files for the web application and database package.

#### `apps/web/.env`
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
NEXT_PUBLIC_CDN_URL=https://your-cdn-domain.com/

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Service
RESEND_API_KEY=re_your_resend_api_key
```

#### `packages/db/.env`
```env
DATABASE_URL=""
```

### 4. Database Setup & Prisma Generation
```bash
npm run db:generate
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to explore StudyHub!

---

## 🛠️ Available Scripts

Run these scripts from the workspace root:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts all workspace applications in development mode |
| `npm run build` | Builds all applications & packages via Turborepo |
| `npm run db:generate` | Generates the Prisma client inside `packages/db` |
| `npm run check-types` | Runs type-checking across all monorepo packages |
| `npm run lint` | Lints all projects using ESLint |
| `npm run sync-s3` | Runs the custom S3 sync script (`scripts/sync-s3.ts`) |
| `npm run start-app` | Launches production Next.js server (`apps/web`) |

---

## 📡 Kafka Telemetry Setup

To enable web telemetry production to Apache Kafka:

1. **Start Kafka and Zookeeper (optional, for local development)**:
   ```bash
   docker-compose up -d
   ```
   This will start ZooKeeper on port 2181 and Kafka on port 9092.

2. **Configure environment variables**:
   Add the following to your `.env.local` file (create one if it doesn't exist in the workspace root):
   ```
   KAFKA_BOOTSTRAP_SERVERS=localhost:9092
   # Optional: change the topic (defaults to web_telemetry)
   KAFKA_TOPIC=web_telemetry

   # Optional: Secure Kafka connection (SASL_SSL)
   # KAFKA_SASL_MECHANISM=SCRAM-SHA-256
   # KAFKA_SASL_USERNAME=your_username
   # KAFKA_SASL_PASSWORD=your_password
   # KAFKA_SSL_CA_LOCATION=path/to/ca.pem  # Relative to project root or absolute
   ```
   Ensure `DATABASE_URL` is already set for the database (as per the existing setup).

3. **Run the application**:
   ```bash
   npm run dev
   ```
   The Next.js app will now collect telemetry events (page views, clicks) and send them to the Kafka topic via the `/api/telemetry` API route.

4. **Verify telemetry is being produced**:
   - Use the Kafka CLI to consume from the topic:
     ```bash
     docker exec -it <kafka-container> kafka-console-consumer --bootstrap-server localhost:9092 --topic web_telemetry --from-beginning
     ```
   - You should see JSON events printed as you interact with the app.

5. **Your external Go consumer** can now read from the same topic `web_telemetry` to process the events.

---

## 🚢 Deployment & CI/CD

StudyHub includes a fully automated GitHub Actions workflow [.github/workflows/deploy.yml](file:///e:/Co-hort/StudyHub/.github/workflows/deploy.yml).

- **AWS ECR**: Builds the production Docker image and pushes tags `:latest` and `:${{ github.sha }}` to Amazon ECR.
- **AWS ECS**: Forces a seamless zero-downtime deployment update on your ECS service.

### GitHub Repository Secrets Needed:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` *(Default: `us-east-1`)*
- `ECR_REPOSITORY` *(Default: `studyhub`)*
- `ECS_CLUSTER` & `ECS_SERVICE` *(Optional: triggers ECS deployment)*

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is released under the [MIT License](LICENSE).
