-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('Food', 'Health', 'Education', 'Other');

-- CreateTable
CREATE TABLE "public"."Campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."Category" NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "goalAmount" DOUBLE PRECISION NOT NULL,
    "raisedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaigns_pkey" PRIMARY KEY ("id")
);
