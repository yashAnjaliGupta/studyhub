-- CreateTable
CREATE TABLE "BookChapter" (
    "id" INTEGER NOT NULL,
    "board" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "chapterName" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookChapter_board_idx" ON "BookChapter"("board");

-- CreateIndex
CREATE INDEX "BookChapter_className_idx" ON "BookChapter"("className");

-- CreateIndex
CREATE INDEX "BookChapter_subjectName_idx" ON "BookChapter"("subjectName");

-- CreateIndex
CREATE INDEX "BookChapter_bookName_idx" ON "BookChapter"("bookName");

-- CreateIndex
CREATE INDEX "BookChapter_language_idx" ON "BookChapter"("language");

-- CreateIndex
CREATE INDEX "BookChapter_board_className_idx" ON "BookChapter"("board", "className");

-- CreateIndex
CREATE INDEX "BookChapter_board_className_subjectName_idx" ON "BookChapter"("board", "className", "subjectName");

-- CreateIndex
CREATE INDEX "BookChapter_board_className_subjectName_bookName_idx" ON "BookChapter"("board", "className", "subjectName", "bookName");
