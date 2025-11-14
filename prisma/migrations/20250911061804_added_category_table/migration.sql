/*
  Warnings:

  - The `imageUrl` column on the `Campaigns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `location` to the `Campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('Active', 'Completed', 'Inactive');

-- AlterTable
ALTER TABLE "public"."Campaigns" ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "status" "public"."Status" NOT NULL,
DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrl" TEXT[];
