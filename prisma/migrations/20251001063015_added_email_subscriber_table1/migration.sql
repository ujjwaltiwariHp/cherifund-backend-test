/*
  Warnings:

  - You are about to drop the `EmailSuscriber` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."EmailSuscriber";

-- CreateTable
CREATE TABLE "public"."EmailSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_email_key" ON "public"."EmailSubscriber"("email");
