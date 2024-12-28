-- CreateTable
CREATE TABLE "TwitterStats" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitterStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitterStats_username_year_key" ON "TwitterStats"("username", "year");
