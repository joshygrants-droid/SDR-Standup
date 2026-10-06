-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "meetingsToday" INTEGER,
ADD COLUMN     "sqosToPush" INTEGER;

-- AlterTable
ALTER TABLE "ManagerSettings" ALTER COLUMN "key" SET DEFAULT 'manager';
