/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `blacklisted` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."blacklisted" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '24 hours';

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_token_key" ON "public"."blacklisted"("token");
