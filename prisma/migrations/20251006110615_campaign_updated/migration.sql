/*
  Warnings:

  - Changed the type of `title` on the `Campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `description` on the `Campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `keyPoints` on the `Campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `summary` on the `Campaigns` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Campaigns" DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB NOT NULL,
DROP COLUMN "keyPoints",
ADD COLUMN     "keyPoints" JSONB NOT NULL,
DROP COLUMN "summary",
ADD COLUMN     "summary" JSONB NOT NULL;
