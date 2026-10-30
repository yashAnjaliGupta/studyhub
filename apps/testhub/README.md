# 🎯 TestHub CBT Platform (`apps/testhub`)

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![CBT Exam Ready](https://img.shields.io/badge/Exam-CBT%20Simulation-0875f9)](https://github.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20AI-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis%20State-00E599?logo=redis)](https://upstash.com/)

**TestHub** is the computer-based testing (CBT) examination simulator and performance diagnostic engine of the StudyHub ecosystem. Engineered to replicate the exact conditions of high-stakes national competitive entrance tests (**JEE Main**, **JEE Advanced**, and **NEET**), TestHub combines authentic examination palettes, timed section workflows, numerical range evaluation, interactive performance visualizations, and personalized AI mentorship powered by **AWS Bedrock**.

---

## 📸 TestHub CBT Visual Tour

### 1. Paper Archive & Discovery
Explore hundreds of authentic national exam papers with instant search, year selection (2002–2025), and subject filters (*Physics*, *Chemistry*, *Mathematics*).
![Paper Library](../../screenshots/flow-2438/01_papers_library.png)

---

### 2. Candidate Onboarding & Instructions Modal
Authentic bilingual examination instructions matching official guidelines (marking rules, section breakdown, and navigation keyboard shortcuts).
![Instructions Modal](../../screenshots/flow-2438/03_exam_instructions.png)

---

### 3. Fullscreen CBT Test Interface
Authentic testing window with real-time countdown timer, KaTeX-formatted formulas, option selection, and floating diagram scratchpad.
![Live CBT Screen](../../screenshots/flow-2438/05_exam_cbt_interface_q1.png)

---

### 4. Interactive 5-State Question Palette
Real-time state tracking per question matching official NTA standards:
- ⚪ **Not Visited**: Candidate has not opened this question yet.
- 🔴 **Not Answered**: Visited but no option selected.
- 🟢 **Answered**: Option selected or numerical value provided.
- 🟣 **Marked for Review**: Flagged for later reconsideration without an answer.
- 🟣🟢 **Answered & Marked for Review**: Answered but flagged for evaluation.

![Question Palette](../../screenshots/flow-2438/07_exam_palette_status.png)

---

### 5. Automated Scorecard & Results Summary
Instant scoring calculation applying official negative marking schemes (+4 for correct, -1 for incorrect, 0 for unattempted) with accuracy metrics.
![Scorecard](../../screenshots/flow-2438/09_exam_results_scorecard.png)

---

### 6. 6-Section Performance Diagnostic Engine
Granular behavioral telemetry analyzing:
- **Speed vs. Accuracy**: Identifies rushing vs. over-deliberation.
- **Time Traps**: Spots questions that consumed > 3 minutes with incorrect answers.
- **Guesswork Detection**: Highlights rapid answer changes and late-stage guessing.
- **Topic Mastery**: Aggregates accuracy across individual subject subtopics.

![Diagnostic Analytics](../../screenshots/flow-2438/10_detailed_analysis.png)

---

### 7. AI Exam Strategist & Mentor (AWS Bedrock)
Personalized post-exam mentorship using Claude 3.5 Sonnet / Haiku, synthesizing mistakes into high-priority revision action items and concept breakdowns.
![AI Guidance](../../screenshots/flow-2438/11_ai_guidance_insights.png)

---

## ⚡ Core Features Breakdown

### 1. Comprehensive Question Formats
- **Single-choice Multiple Choice (`mcq_single`)**: Standard single-option questions.
- **Multiple-choice Multiple Correct (`mcq_multiple`)**: JEE Advanced partial/full marking support.
- **Numerical Value Input (`numerical`)**: Floating-point inputs verified against tolerance ranges (e.g. `42.50 ± 0.05`).
- **Diagram Questions**: Embedded vector SVG schematics and raster plots extracted by `services/pdf-parser`.

### 2. In-Browser Diagram Canvas
- Interactive drawing canvas (`components/diagram-canvas.tsx`) allowing candidates to draw free-body diagrams, circuit loops, or rough scratchpad calculations directly on screen.

### 3. Distributed State & Hot Caching
- **Upstash Redis REST API**: Sub-2ms attempt and analysis caching (`exam:{id}:analysis`, `student:{id}:latest_exam_analysis`).
- **PostgreSQL Persistence**: Durable long-term storage in `ExamAttempt`, `ExamAttemptAnswer`, and `AIGuidanceReport` tables.

### 4. Real-time Telemetry with Apache Kafka
- Non-blocking candidate action dispatching to Kafka topics (`exam-telemetry`), recording:
  - Option selection timestamps
  - Palette section jumps
  - Window blur / tab switch anti-cheating alerts
  - Review status toggles

---

## 📁 Directory Structure

```
apps/testhub/
├── app/
│   ├── api/
│   │   ├── auth/                      # NextAuth authentication & OTP routes
│   │   ├── chat/                      # Exam solution Q&A chatbot
│   │   ├── exam/
│   │   │   ├── ai-report/             # AWS Bedrock personalized AI guidance generator
│   │   │   ├── attempt/[id]/          # Exam attempt lifecycle queries
│   │   │   ├── diagnostic-report/     # 6-section behavioral diagnostic engine
│   │   │   └── submit/                # Scoring, Redis hot-caching & DB persistence
│   │   ├── papers/                    # Paper discovery & metadata queries
│   │   ├── questions/                 # Question bank queries & solution enricher
│   │   └── telemetry/                 # Kafka non-blocking telemetry endpoint
│   ├── exam/
│   │   └── [id]/
│   │       ├── ai-guidance/           # AI mentor strategic feedback page
│   │       ├── detailed-analysis/     # 6-section diagnostic charts & analysis
│   │       ├── results/               # Immediate scorecard & metrics
│   │       └── page.tsx               # Fullscreen live CBT examination window
│   ├── papers/                        # Past paper catalog
│   ├── questions/                     # Subject-wise topic question bank
│   ├── signin/ & signup/              # Candidate authentication & OTP verification
│   └── page.tsx                       # Candidate home dashboard
├── components/
│   ├── diagram-canvas.tsx             # Interactive scratchpad canvas
│   ├── interactive-performance-chart  # Interactive performance visualizer
│   ├── question-inputs.tsx            # MCQ & numerical input handlers
│   ├── testhub-loader.tsx             # Branded loading spinner
│   └── ui.tsx                         # Core UI components
├── lib/
│   ├── diagnostic-engine.ts           # Telemetry behavioral classification
│   ├── exam-session.ts                # Session state, score calculation & Redis sync
│   ├── paper-service.ts               # Database paper queries
│   ├── redis.ts                       # Upstash Redis client with in-memory fallback
│   └── solution-generator.ts          # AI step-by-step mathematical proof generator
└── package.json
```

---

## 🛠️ Environment Variables

Create `.env` inside `apps/testhub/` or reference the root `.env`:

```env
# Database Connection (PostgreSQL + pgvector)
DATABASE_URL="postgresql://postgres:password@localhost:5432/studyhub?schema=public"

# AWS Configuration (S3 & Bedrock)
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-generated-nextauth-secret-key"

# Upstash Redis (Session & Diagnostic Hot Cache)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Apache Kafka Telemetry
KAFKA_BROKERS="localhost:9092"
KAFKA_EXAM_TOPIC="exam-telemetry"
```

---

## 🚀 Development & Production

```bash
# Run TestHub in development mode (port 3001)
npm run dev:testhub

# Build TestHub in Next.js standalone mode
npm run build --workspace=testhub

# Start production server
npm run start:testhub
```
