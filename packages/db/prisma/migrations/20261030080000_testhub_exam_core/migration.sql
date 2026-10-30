-- CreateEnum
CREATE TYPE "ExamAttemptStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'INSIGHTS_AVAILABLE');

-- AlterTable
ALTER TABLE "PageEmbedding" ADD COLUMN     "diagramSvg" TEXT,
ADD COLUMN     "hasVisuals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visualsJson" JSONB;

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "instructions" TEXT,
    "documentJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "paperId" TEXT,
    "topicId" TEXT,
    "sequenceNum" INTEGER,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'mcq_single',
    "subject" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "diagramSvg" TEXT,
    "pageNumber" INTEGER,
    "marks" INTEGER NOT NULL DEFAULT 4,
    "negativeMarks" INTEGER DEFAULT 1,
    "options" JSONB DEFAULT '[]',
    "correctOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numericalAnswer" JSONB,
    "solutionText" TEXT,
    "solutionSvg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "status" "ExamAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "config" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "selectedOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textAnswer" TEXT,
    "markedForReview" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTopicMetrics" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "avgTimeSpent" INTEGER NOT NULL,
    "lastAttempted" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTopicMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGuidanceReport" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "reportVersion" TEXT NOT NULL,
    "inputVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGuidanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paper_subject_examType_year_idx" ON "Paper"("subject", "examType", "year");

-- CreateIndex
CREATE INDEX "Question_paperId_sequenceNum_idx" ON "Question"("paperId", "sequenceNum");

-- CreateIndex
CREATE INDEX "Question_subject_idx" ON "Question"("subject");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "Topic_subject_name_idx" ON "Topic"("subject", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subject_name_key" ON "Topic"("subject", "name");

-- CreateIndex
CREATE INDEX "ExamAttempt_studentId_status_idx" ON "ExamAttempt"("studentId", "status");

-- CreateIndex
CREATE INDEX "ExamAttempt_paperId_idx" ON "ExamAttempt"("paperId");

-- CreateIndex
CREATE INDEX "ExamAttempt_createdAt_idx" ON "ExamAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "ExamAttemptAnswer_questionId_idx" ON "ExamAttemptAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptAnswer_attemptId_questionId_key" ON "ExamAttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "StudentTopicMetrics_studentId_idx" ON "StudentTopicMetrics"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTopicMetrics_studentId_topicId_key" ON "StudentTopicMetrics"("studentId", "topicId");

-- CreateIndex
CREATE INDEX "AIGuidanceReport_createdAt_idx" ON "AIGuidanceReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIGuidanceReport_attemptId_reportVersion_key" ON "AIGuidanceReport"("attemptId", "reportVersion");

-- CreateIndex
CREATE INDEX "PageEmbedding_hasVisuals_idx" ON "PageEmbedding"("hasVisuals");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptAnswer" ADD CONSTRAINT "ExamAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttemptAnswer" ADD CONSTRAINT "ExamAttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicMetrics" ADD CONSTRAINT "StudentTopicMetrics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGuidanceReport" ADD CONSTRAINT "AIGuidanceReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

