-- CreateTable
CREATE TABLE "competition_events" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "competition_events" ADD CONSTRAINT "competition_events_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
