-- AlterTable
ALTER TABLE "athlete_registration_requests" ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "weight_category_id" TEXT;

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "team_id" TEXT;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_registration_requests" ADD CONSTRAINT "athlete_registration_requests_weight_category_id_fkey" FOREIGN KEY ("weight_category_id") REFERENCES "weight_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
