/*
  Warnings:

  - You are about to drop the column `sports_rank` on the `athletes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "athlete_registration_requests" ADD COLUMN     "sports_rank_id" TEXT;

-- AlterTable
ALTER TABLE "athletes" DROP COLUMN "sports_rank",
ADD COLUMN     "sports_rank_id" TEXT;

-- CreateTable
CREATE TABLE "sports_ranks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_ranks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sports_ranks_name_key" ON "sports_ranks"("name");

-- AddForeignKey
ALTER TABLE "athlete_registration_requests" ADD CONSTRAINT "athlete_registration_requests_sports_rank_id_fkey" FOREIGN KEY ("sports_rank_id") REFERENCES "sports_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_sports_rank_id_fkey" FOREIGN KEY ("sports_rank_id") REFERENCES "sports_ranks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
