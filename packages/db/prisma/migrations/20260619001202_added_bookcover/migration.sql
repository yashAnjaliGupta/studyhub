-- CreateTable
CREATE TABLE "BookCover" (
    "id" INTEGER NOT NULL,
    "board" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "book_name" TEXT NOT NULL,
    "CoverURL" TEXT NOT NULL,

    CONSTRAINT "BookCover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookCover_board_class_name_subject_name_book_name_idx" ON "BookCover"("board", "class_name", "subject_name", "book_name");

-- CreateIndex
CREATE UNIQUE INDEX "BookCover_board_class_name_subject_name_book_name_key" ON "BookCover"("board", "class_name", "subject_name", "book_name");
