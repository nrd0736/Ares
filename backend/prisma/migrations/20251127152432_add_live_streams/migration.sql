-- CreateTable
CREATE TABLE "live_streams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rutube_url" TEXT NOT NULL,
    "competition_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_streams_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
