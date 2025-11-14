/*
  Warnings:

  - Changed the type of `location` on the `Event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "location",
ADD COLUMN     "location" JSONB NOT NULL;
