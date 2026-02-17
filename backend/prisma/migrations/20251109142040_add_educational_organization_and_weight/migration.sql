-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "athletes" ADD COLUMN     "educational_organization_id" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "coaches" ADD COLUMN     "educational_organization_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "educational_organization_id" TEXT;

-- CreateTable
CREATE TABLE "athlete_registration_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educational_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "address" TEXT,
    "contact_info" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "athlete_registration_requests_user_id_key" ON "athlete_registration_requests"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_educational_organization_id_fkey" FOREIGN KEY ("educational_organization_id") REFERENCES "educational_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_registration_requests" ADD CONSTRAINT "athlete_registration_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_registration_requests" ADD CONSTRAINT "athlete_registration_requests_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_educational_organization_id_fkey" FOREIGN KEY ("educational_organization_id") REFERENCES "educational_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_educational_organization_id_fkey" FOREIGN KEY ("educational_organization_id") REFERENCES "educational_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
