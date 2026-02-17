/*
  Warnings:

  - You are about to drop the `temporary_passwords` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "temporary_passwords" DROP CONSTRAINT "temporary_passwords_user_id_fkey";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "temporary_passwords";
