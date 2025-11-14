/*
  Warnings:

  - The `imageUrl` column on the `Campaigns` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Campaigns" DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrl" JSONB[];
