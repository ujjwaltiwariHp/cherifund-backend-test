/*
  Warnings:

  - Changed the type of `title` on the `Banner` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `subtitle` on the `Banner` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Banner" DROP COLUMN "title",
ADD COLUMN     "title" JSONB NOT NULL,
DROP COLUMN "subtitle",
ADD COLUMN     "subtitle" JSONB NOT NULL;
