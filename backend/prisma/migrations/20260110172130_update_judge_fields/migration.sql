/*
  Warnings:

  - You are about to drop the column `position` on the `judge_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "competition_judges" ADD COLUMN     "category" TEXT,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "judge_profiles" DROP COLUMN "position";
