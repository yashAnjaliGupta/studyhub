-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterEnum
ALTER TYPE "FileStatus" ADD VALUE 'PROCESSING';

-- CreateTable
CREATE TABLE "PageEmbedding" (
    "id" TEXT NOT NULL,
    "fileId" INTEGER,
    "chapterId" INTEGER,
    "pageNumber" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageEmbedding_fileId_idx" ON "PageEmbedding"("fileId");

-- CreateIndex
CREATE INDEX "PageEmbedding_chapterId_idx" ON "PageEmbedding"("chapterId");

-- AddForeignKey
ALTER TABLE "PageEmbedding" ADD CONSTRAINT "PageEmbedding_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageEmbedding" ADD CONSTRAINT "PageEmbedding_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
