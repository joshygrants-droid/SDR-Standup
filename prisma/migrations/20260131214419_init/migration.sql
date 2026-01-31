-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SDR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE INDEX "DailyEntry_date_idx" ON "DailyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");
