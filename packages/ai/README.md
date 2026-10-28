# 🧠 AI Service Library (`@repo/ai`)

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20Runtime-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Claude 3](https://img.shields.io/badge/Anthropic-Claude%203%20Sonnet-d97706)](https://www.anthropic.com/)
[![Titan Embeddings](https://img.shields.io/badge/Amazon-Titan%20Embeddings%20V2-2563eb)](https://aws.amazon.com/bedrock/)

The `@repo/ai` package manages all generative AI and vector embedding infrastructure across the StudyHub monorepo using **AWS Bedrock Runtime**. It provides embedding generation for retrieval-augmented generation (RAG) and domain-specific services for exam coaching, step-by-step problem explanations, and personalized study plans.

---

## ⚡ Core Capabilities

### 1. Vector Embeddings (`embeddings.ts`)
- **Model**: Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`).
- **Vector Dimension**: `1024` dimensions (normalized for cosine similarity in PostgreSQL `pgvector`).
- **Batch Processing**: Safe handling of multi-page textbook passages with automatic truncation and retries.

### 2. Claude LLM Synthesis (`bedrock.ts`)
- **Model**: Anthropic Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229-v1:0`).
- Configurable inference parameters (`maxTokens`, `temperature`, `topP`).
- Robust error handling for rate limits and credential resolution.

### 3. Exam AI Assistant Service (`ExamAIService`)
- `generateQuestionExplanation`: Produces pedagogical explanations analyzing why the student's selected answer was correct/incorrect and generating reinforcement problems.
- `generateStudyPlan`: Formulates a structured study schedule based on user accuracy, time spent per topic, and identified weak areas.
- `recommendTopicsForReview`: Pinpoints prerequisite concepts and provides targeted revision material.

---

## 📦 Usage Examples

### 1. Generating Embeddings for RAG

```typescript
import { generateEmbedding } from "@repo/ai";

const embeddingVector = await generateEmbedding("Newton's Laws of Motion");
console.log(embeddingVector.length); // 1024
```

### 2. Question Explanation Synthesis

```typescript
import { examAIService } from "@repo/ai";

const explanation = await examAIService.generateQuestionExplanation(
  "What is the work done by a centripetal force?",
  "Zero, because force is perpendicular to displacement",
  "Positive work",
  "Circular Motion"
);

console.log(explanation.content);
```

---

## 🛠️ Required Environment Variables

Ensure the following variables are configured in `.env`:

```env
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
```

