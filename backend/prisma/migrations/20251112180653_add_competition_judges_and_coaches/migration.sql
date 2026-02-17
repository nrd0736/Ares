-- CreateTable
CREATE TABLE "competition_judges" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_coaches" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competition_judges_competition_id_user_id_key" ON "competition_judges"("competition_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_coaches_competition_id_coach_id_key" ON "competition_coaches"("competition_id", "coach_id");

-- AddForeignKey
ALTER TABLE "competition_judges" ADD CONSTRAINT "competition_judges_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_judges" ADD CONSTRAINT "competition_judges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_coaches" ADD CONSTRAINT "competition_coaches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_coaches" ADD CONSTRAINT "competition_coaches_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
