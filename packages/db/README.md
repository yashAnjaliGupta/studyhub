# 🗄️ Database Package (`@repo/db`)

[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-336791?logo=postgresql)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-Vector%20Search-38a169)](https://github.com/pgvector/pgvector)

The `@repo/db` package provides the unified database client, Prisma ORM schema, and database migration history shared across the entire StudyHub monorepo (`apps/web`, `apps/testhub`, and ingestion scripts).

---

## 🏗️ Architecture & Features

- **Prisma Client JS**: Automatically generated client accessible via `@repo/db/client`.
- **PostgreSQL with `pgvector`**: Native vector storage and indexing (`vector(1024)`) powered by Amazon Titan Text Embeddings V2.
- **Dual-Database Support**: Designed for seamless synchronization between remote cloud databases (Neon PostgreSQL) and local development containers (`studyhub_postgres`).

---

## 📊 Core Data Models

```mermaid
erDiagram
    User ||--o{ ExamAttempt : "attempts"
    File ||--o{ PageEmbedding : "embeddings"
    BookChapter ||--o{ PageEmbedding : "embeddings"
    Paper ||--o{ Question : "contains"
    Paper ||--o{ ExamAttempt : "attempted_in"
    Topic ||--o{ Question : "categorizes"
    Topic ||--o{ StudentTopicMetrics : "tracks"
    ExamAttempt ||--o{ ExamAttemptAnswer : "has_answers"
    ExamAttempt ||--o{ AIGuidanceReport : "receives"
    Question ||--o{ ExamAttemptAnswer : "answered_in"
```

### 1. General & Textbook Domain
- `User`: Application user records with email, name, and optional hashed passwords.
- `File`: S3-backed document records (Class, Subject, Exam, Year, status, and S3 keys).
- `BookChapter`: Structured NCERT and State Board textbooks partitioned by board, class, subject, book, and chapter name.
- `BookCover`: Book cover thumbnail URLs for library browsing.
- `PageEmbedding`: Vector chunks (`vector(1024)`) with page numbers, chunk index, extracted text, diagram SVGs, and option visuals.

### 2. Examination Domain (TestHub)
- `Paper`: Examination papers with title, subject, exam type (JEE Main, Advanced, NEET), year, total marks, time limit, and bilingual instructions.
- `Question`: Question bank entries with sequence number, question text, type (`mcq_single`, `mcq_multiple`, `numerical`), marks, negative marks, options array, correct option IDs, numerical tolerance range, and solution text/SVGs.
- `Topic`: Subject taxonomy (Mechanics, Electrostatics, Organic Chemistry, Calculus, etc.).
- `ExamAttempt`: Student test attempt sessions tracking status (`CREATED`, `IN_PROGRESS`, `SUBMITTED`, `EVALUATED`), timing, and shuffle configs.
- `ExamAttemptAnswer`: Answers submitted per question (selected option IDs, numerical string input, review flags).
- `StudentTopicMetrics`: Cumulative accuracy, attempt count, and average time spent per topic.
- `AIGuidanceReport`: Generated AI feedback and revision reports per exam attempt.

---

## 🛠️ Environment Configuration

Create `.env` inside `packages/db/`:

```env
# Primary PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/studybyd?schema=public"

# Optional: Remote Neon PostgreSQL instance for dual-sync scripts
NEON_DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/studyhub?sslmode=require"
```

---

## 🚀 Common Commands

From monorepo root:

```bash
# Generate Prisma Client
npm run db:generate

# Enable pgvector extension on database
npm run init:vector

# Apply database migrations
cd packages/db && npx prisma migrate deploy

# Create a new database migration
cd packages/db && npx prisma migrate dev --name <migration_name>

# Open Prisma Studio web visualizer
cd packages/db && npx prisma studio
```

---

## 📦 Usage in Applications

```typescript
import { client } from "@repo/db/client";

// Query recent papers
const papers = await client.paper.findMany({
  where: { examType: "JEE Main", year: 2024 },
  include: { questions: true },
});
```

