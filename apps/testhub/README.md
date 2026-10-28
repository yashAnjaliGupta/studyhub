# 🎯 TestHub CBT Platform (`apps/testhub`)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![CBT Exam Ready](https://img.shields.io/badge/Exam-CBT%20Simulation-0875f9)](https://github.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20AI-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)

**TestHub** is the computer-based testing (CBT) examination and mock test application of the StudyHub monorepo. It accurately simulates official examination conditions for national competitive exams like **JEE Main**, **JEE Advanced**, and **NEET**, featuring dynamic past papers, interactive question solving, high-fidelity diagram rendering, an AI test analysis assistant, and comprehensive performance analytics.

---

## ⚡ Features

### 1. Realistic CBT Examination Simulation
- **Timed Exam Sessions**: Countdown timer with automatic warning alerts, section transitions, and auto-submission on timeout.
- **NTA / CBT Question Palette**: Real-time status tracking for every question:
  - ⚪ *Not Visited*
  - 🔴 *Not Answered*
  - 🟢 *Answered*
  - 🟣 *Marked for Review*
  - 🟣🟢 *Answered & Marked for Review*
- **Question Types Supported**:
  - Single-choice Multiple Choice (`mcq_single`)
  - Multiple-choice Multiple Correct (`mcq_multiple`)
  - Numerical value questions with floating-point tolerance ranges (`numerical`)
  - Subjective & structured responses

### 2. Dynamic JEE Past Papers & Mock Exams
- **Curated Exam Archive**: Access past papers spanning 2002 to 2025 across all exam shifts and sessions.
- **Topic-Wise Practice**: Filter questions by academic domain: *Physics*, *Chemistry*, *Mathematics*, and *Biology*.
- **Shuffle & Custom Configs**: Randomize questions and options to prevent pattern memorization during test prep.

### 3. Diagram Canvas & Vector Schematics
- **High-Fidelity Diagrams**: Embedded SVG vector diagrams (`diagramSvg`) and option figures extracted by `services/pdf-parser`.
- **Diagram Canvas Tool**: Interactive drawing canvas (`components/diagram-canvas.tsx`) allowing students to annotate, sketch, and solve problems directly on screen.

### 4. AI-Powered Analysis & Solution Explanations
- **Analysis Chatbot**: Embedded assistant (`components/analysis-chatbot.tsx`) explaining step-by-step solutions for any attempted problem.
- **Intelligent Feedback**: Explains why chosen incorrect options were wrong, identifies core concepts to review, and generates tailored practice questions.

### 5. Automated Evaluation & Metrics
- **Instant Result Computation**: Computes scores using JEE scoring schemes (+4 for correct, -1 for incorrect, 0 for unattempted).
- **Topic-Level Accuracy**: Updates `StudentTopicMetrics` in PostgreSQL to track weak vs. strong topics over time.

### 6. Candidate Authentication & Email OTP Verification
- **Resend OTP Integration**: Secure 2-step registration verifying candidate emails via 6-digit OTP before saving to PostgreSQL.
- **Single Sign-On & OAuth**: Supports Google OAuth and salted password credentials with session persistence.

---

## 📁 Directory Structure

```
apps/testhub/
├── app/
│   ├── api/
│   │   ├── auth/             # NextAuth authentication routes
│   │   ├── chat/             # AI exam analysis chat endpoint
│   │   ├── exam/             # Exam session lifecycle (create, answer, submit, evaluate)
│   │   ├── papers/           # Paper discovery & metadata queries
│   │   └── questions/        # Question bank queries by subject & topic
│   ├── exam/                 # Live CBT test interface
│   │   └── [id]/page.tsx     # Fullscreen CBT examination UI
│   ├── papers/               # Past year paper browser
│   │   └── [id]/page.tsx     # Paper details, syllabus, & start prompt
│   ├── questions/            # Subject-wise topic question banks
│   ├── signin/ & signup/     # TestHub CBT authentication pages
│   ├── globals.css           # TestHub styling & star progress animations
│   ├── layout.tsx            # Root layout with AuthProvider & styles
│   └── page.tsx              # TestHub home dashboard
├── components/
│   ├── analysis-chatbot.tsx  # AI solution explainer dialog
│   ├── auth-provider.tsx     # NextAuth SessionProvider wrapper
│   ├── diagram-canvas.tsx    # Interactive diagram scratchpad
│   ├── paper-processing.tsx  # Ingestion & parsing progress indicator
│   ├── question-inputs.tsx   # MCQ and Numerical input components
│   ├── testhub-loader.tsx    # Branded progress indicator
│   └── ui.tsx                # CBT UI primitives
├── lib/
│   ├── auth.ts               # Re-exported NextAuth helpers from @repo/auth
│   ├── exam-session.ts       # Attempt state, timing, and score calculations
│   ├── jee-mock-paper.ts     # Sample offline JEE mock paper provider
│   ├── paper-service.ts      # Database query service for papers & questions
│   └── solution-generator.ts # Solution synthesis routines
└── package.json
```

---

## 🛠️ Environment Variables

Create `.env` inside `apps/testhub/`:

```env
# Database Connection (Neon PostgreSQL with pgvector)
DATABASE_URL="postgresql://user:password@localhost:5432/studybyd?schema=public"

# AWS Configuration (S3 & Bedrock)
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
NEXT_PUBLIC_CDN_URL="https://your-cdn-domain.com/"

# NextAuth Configuration (Default port: 3001)
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# TypeSafe AI (Optional structured exam extraction)
TYPESAFE_API_KEY="your-typesafe-api-key"

# Resend Email Service (Candidate OTP verification)
RESEND_API_KEY="re_your_resend_api_key"
RESEND_FROM_EMAIL="TestHub <support@yashguptaiiit.in>"

# Apache Kafka Telemetry
KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
KAFKA_TOPIC="web_telemetry"
```

---

## 🚀 Running TestHub

From the repository root:

```bash
# Start TestHub development server on port 3001
npm run dev:testhub

# Start production build on port 3001
npm run start:testhub
```

Open [http://localhost:3001](http://localhost:3001) to begin taking mock tests!

