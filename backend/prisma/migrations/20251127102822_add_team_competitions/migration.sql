-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- DropForeignKey
ALTER TABLE "brackets" DROP CONSTRAINT "brackets_weight_category_id_fkey";

-- AlterTable
ALTER TABLE "brackets" ALTER COLUMN "weight_category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "competition_type" "CompetitionType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "team1_id" TEXT,
ADD COLUMN     "team2_id" TEXT,
ADD COLUMN     "winner_team_id" TEXT;

-- CreateTable
CREATE TABLE "team_participants" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_participants_competition_id_team_id_key" ON "team_participants"("competition_id", "team_id");

-- AddForeignKey
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_weight_category_id_fkey" FOREIGN KEY ("weight_category_id") REFERENCES "weight_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
