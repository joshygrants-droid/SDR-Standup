-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SDR', 'MANAGER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SDR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "goalDials" INTEGER,
    "goalNewProspects" INTEGER,
    "goalSetsTotal" INTEGER,
    "goalSetsNewBiz" INTEGER,
    "goalSetsExpansion" INTEGER,
    "goalSQOs" INTEGER,
    "focusText" TEXT,
    "actualDials" INTEGER,
    "actualNewProspects" INTEGER,
    "actualSetsNewBiz" INTEGER,
    "actualSetsExpansion" INTEGER,
    "actualSQOs" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE INDEX "DailyEntry_date_idx" ON "DailyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
