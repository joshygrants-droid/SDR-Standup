CREATE TABLE "ManagerSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagerSettings_key_key" ON "ManagerSettings"("key");
