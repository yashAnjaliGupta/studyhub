/*
  Warnings:

  - You are about to drop the column `createdAt` on the `BookChapter` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BookChapter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookChapter" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
