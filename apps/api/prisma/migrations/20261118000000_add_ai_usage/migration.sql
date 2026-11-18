-- Persist per-user UTC daily AI request counts so limits work across restarts.
CREATE TABLE "AiUsage" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("userId","day")
);
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
