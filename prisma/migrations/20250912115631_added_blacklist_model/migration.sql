/*
  Warnings:

  - You are about to drop the `blacklisted` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."blacklisted";

-- CreateTable
CREATE TABLE "public"."Blacklisted" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '24 hours',

    CONSTRAINT "Blacklisted_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blacklisted_token_key" ON "public"."Blacklisted"("token");
